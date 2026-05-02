// /api/submit-quote - Customer submits a quote request
// Saves to Supabase + sends email notification to admin

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    marketing_consent,
    living_sqft,
    stories,
    bedrooms,
    bathrooms,
    year_built,
    property_data_source,
    services,
    price_low,
    price_high
  } = req.body;

  // Validate required fields
  if (!customer_name || !customer_phone || !customer_email || !customer_address) {
    return res.status(400).json({
      error: 'Name, phone, email, and address are required.'
    });
  }

  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({
      error: 'At least one service must be selected.'
    });
  }

  // Initialize Supabase with service role key (server-side only)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Insert quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        marketing_consent: !!marketing_consent,
        living_sqft: living_sqft || null,
        stories: stories || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        year_built: year_built || null,
        property_data_source: property_data_source || null,
        services: services,
        price_low: price_low || null,
        price_high: price_high || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save quote: ' + error.message });
    }

    // Send email notification (non-blocking - we don't want to fail the request if email fails)
    sendNotificationEmail(quote).catch(err => {
      console.error('Email notification failed:', err);
    });

    return res.status(200).json({
      success: true,
      quote_id: quote.id,
      message: 'Quote submitted successfully'
    });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function sendNotificationEmail(quote) {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!resendKey || !adminEmail) {
    console.log('Resend not configured, skipping email');
    return;
  }

  const servicesList = quote.services
    .map(s => `<li><strong>${s.name || s.type}:</strong> ${s.details || ''} - $${s.price_low || 0} to $${s.price_high || 0}</li>`)
    .join('');

  const subject = `New Quote Request: ${quote.customer_name} - $${quote.price_low}-$${quote.price_high}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4a9eff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">New Quote Request</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Restoration Pressure Washing LLC</p>
      </div>
      <div style="background: #f5f7fa; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">

        <h2 style="font-size: 16px; margin-top: 0; color: #1a2028;">Customer</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Name:</td><td style="padding: 6px 0;"><strong>${quote.customer_name}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone:</td><td style="padding: 6px 0;"><a href="tel:${quote.customer_phone}">${quote.customer_phone}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email:</td><td style="padding: 6px 0;"><a href="mailto:${quote.customer_email}">${quote.customer_email}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Address:</td><td style="padding: 6px 0;">${quote.customer_address}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Marketing OK:</td><td style="padding: 6px 0;">${quote.marketing_consent ? '✓ Yes' : 'No'}</td></tr>
        </table>

        <h2 style="font-size: 16px; color: #1a2028;">Services Requested</h2>
        <ul style="padding-left: 20px;">${servicesList}</ul>

        <div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 6px;">
          <div style="color: #065f46; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Total Estimate</div>
          <div style="font-size: 24px; font-weight: 700; color: #065f46;">$${quote.price_low} - $${quote.price_high}</div>
        </div>

        ${quote.living_sqft ? `
        <h2 style="font-size: 16px; color: #1a2028;">Property Info</h2>
        <p style="margin: 6px 0;">${quote.living_sqft} sq ft, ${quote.stories || '?'} story${quote.year_built ? `, built ${quote.year_built}` : ''}</p>
        ` : ''}

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="${process.env.PUBLIC_URL || ''}/admin"
             style="display: inline-block; background: #4a9eff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Open Dashboard
          </a>
        </div>

        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          Submitted ${new Date(quote.created_at).toLocaleString('en-US', { timeZone: 'America/Detroit' })}
        </p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Restoration Quotes <quotes@resend.dev>',
      to: [adminEmail],
      subject: subject,
      html: html,
      reply_to: quote.customer_email
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend ${response.status}: ${errText}`);
  }
}
