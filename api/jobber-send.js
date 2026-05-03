import { createClient } from '@supabase/supabase-js';

async function getValidToken(supabase) {
  const { data, error } = await supabase
    .from('jobber_tokens')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    throw new Error('No Jobber tokens found. Please connect to Jobber first.');
  }

  // Try current access token
  const testRes = await fetch('https://api.getjobber.com/api/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${data.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: '{ account { name } }' }),
  });

  if (testRes.ok) {
    return data.access_token;
  }

  // Token expired - refresh it
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;

  const refreshRes = await fetch('https://api.getjobber.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    throw new Error('Failed to refresh token. Please reconnect to Jobber.');
  }

  const newTokens = await refreshRes.json();

  await supabase
    .from('jobber_tokens')
    .upsert({
      id: 1,
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      updated_at: new Date().toISOString(),
    });

  return newTokens.access_token;
}

async function jobberGraphQL(token, query, variables = {}) {
  const res = await fetch('https://api.getjobber.com/api/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join(', '));
  }
  return json.data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const token = await getValidToken(supabase);
    const quote = req.body;

    // Step 1: Create the client
    const clientData = await jobberGraphQL(token, `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
          }
          userErrors {
            message
            path
          }
        }
      }
    `, {
      input: {
        firstName: quote.firstName || 'Property',
        lastName: quote.lastName || 'Owner',
        ...(quote.email && { emails: [{ description: "main", primary: true, address: quote.email }] }),
        ...(quote.phone && { phones: [{ description: "main", primary: true, number: quote.phone }] }),
        billingAddress: {
          street1: quote.address || '',
          city: quote.city || '',
          province: quote.state || '',
          postalCode: quote.zip || '',
          country: 'US',
        },
      },
    });

    const client = clientData.clientCreate.client;
    if (!client) {
      const errors = clientData.clientCreate.userErrors;
      throw new Error('Failed to create client: ' + errors.map(e => e.message).join(', '));
    }

    // Step 2: Create a quote for that client
    const lineItems = [];
    if (quote.services) {
      for (const svc of quote.services) {
        if (svc.total > 0) {
          lineItems.push({
            name: svc.name,
            description: svc.description || '',
            qty: 1,
            unitPrice: svc.total,
          });
        }
      }
    }

    if (lineItems.length === 0 && quote.totalPrice) {
      lineItems.push({
        name: 'Restoration Services',
        description: quote.description || `Quote for ${quote.address || 'property'}`,
        qty: 1,
        unitPrice: quote.totalPrice,
      });
    }

    const quoteData = await jobberGraphQL(token, `
      mutation CreateQuote($input: QuoteCreateInput!) {
        quoteCreate(input: $input) {
          quote {
            id
            quoteNumber
            title
            amounts {
              total
            }
          }
          userErrors {
            message
            path
          }
        }
      }
    `, {
      input: {
        clientId: client.id,
        title: `Restoration Quote - ${quote.address || 'New Property'}`,
        message: quote.notes || '',
        lineItems: lineItems,
      },
    });

    const jobberQuote = quoteData.quoteCreate.quote;
    if (!jobberQuote) {
      const errors = quoteData.quoteCreate.userErrors;
      throw new Error('Failed to create quote: ' + errors.map(e => e.message).join(', '));
    }

    return res.status(200).json({
      success: true,
      clientId: client.id,
      quoteId: jobberQuote.id,
      quoteNumber: jobberQuote.quoteNumber,
    });

  } catch (err) {
    console.error('Jobber send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
