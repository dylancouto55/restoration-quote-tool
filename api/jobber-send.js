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
    const body = req.body;
    const action = body.action || 'both'; // 'createClient', 'createQuote', or 'both'

    // ---- CREATE CLIENT ----
    if (action === 'createClient' || action === 'both') {
      const clientInput = {
        firstName: body.firstName || 'Property',
        lastName: body.lastName || 'Owner',
        billingAddress: {
          street1: body.address || '',
          city: body.city || '',
          province: body.state || '',
          postalCode: body.zip || '',
          country: 'US',
        },
      };
      if (body.email) {
        clientInput.emails = [{ description: "main", primary: true, address: body.email }];
      }
      if (body.phone) {
        clientInput.phones = [{ description: "main", primary: true, number: body.phone }];
      }
      if (body.companyName) {
        clientInput.companyName = body.companyName;
      }

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
      `, { input: clientInput });

      const client = clientData.clientCreate.client;
      if (!client) {
        const errors = clientData.clientCreate.userErrors;
        throw new Error('Failed to create client: ' + errors.map(e => e.message).join(', '));
      }

      // If only creating client, return now
      if (action === 'createClient') {
        return res.status(200).json({
          success: true,
          action: 'createClient',
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
        });
      }

      // For 'both', continue to quote creation with this client
      body.clientId = client.id;
    }

    // ---- CREATE QUOTE ----
    if (action === 'createQuote' || action === 'both') {
      // If no clientId provided, create client first
      let clientId = body.clientId;
      if (!clientId) {
        const clientInput = {
          firstName: body.firstName || 'Property',
          lastName: body.lastName || 'Owner',
          billingAddress: {
            street1: body.address || '',
            city: body.city || '',
            province: body.state || '',
            postalCode: body.zip || '',
            country: 'US',
          },
        };
        if (body.email) {
          clientInput.emails = [{ description: "main", primary: true, address: body.email }];
        }
        if (body.phone) {
          clientInput.phones = [{ description: "main", primary: true, number: body.phone }];
        }

        const clientData = await jobberGraphQL(token, `
          mutation CreateClient($input: ClientCreateInput!) {
            clientCreate(input: $input) {
              client { id firstName lastName }
              userErrors { message path }
            }
          }
        `, { input: clientInput });

        const client = clientData.clientCreate.client;
        if (!client) {
          const errors = clientData.clientCreate.userErrors;
          throw new Error('Failed to create client: ' + errors.map(e => e.message).join(', '));
        }
        clientId = client.id;
      }

      // Build line items from services
      const lineItems = [];
      if (body.services) {
        for (const svc of body.services) {
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

      if (lineItems.length === 0 && body.totalPrice) {
        lineItems.push({
          name: 'Restoration Services',
          description: body.description || `Quote for ${body.address || 'property'}`,
          qty: 1,
          unitPrice: body.totalPrice,
        });
      }

      const quoteData = await jobberGraphQL(token, `
        mutation CreateQuote($input: QuoteCreateInput!) {
          quoteCreate(input: $input) {
            quote {
              id
              quoteNumber
              title
              amounts { total }
            }
            userErrors { message path }
          }
        }
      `, {
        input: {
          clientId: clientId,
          title: `Restoration Quote - ${body.address || 'New Property'}`,
          message: body.notes || '',
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
        action: action,
        clientId: clientId,
        quoteId: jobberQuote.id,
        quoteNumber: jobberQuote.quoteNumber,
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use createClient, createQuote, or both.' });

  } catch (err) {
    console.error('Jobber send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
