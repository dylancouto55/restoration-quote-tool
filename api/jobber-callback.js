import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    return res.status(500).send('Server configuration error');
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://restoration-quote-tool.vercel.app/api/jobber-callback',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token exchange failed:', errText);
      return res.status(500).send('Failed to exchange authorization code');
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token } = tokenData;

    // Store tokens in Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('jobber_tokens')
      .upsert({
        id: 1,
        access_token,
        refresh_token,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).send('Failed to store tokens');
    }

    // Redirect back to admin dashboard with success message
    res.redirect(302, '/admin.html?jobber=connected');
  } catch (err) {
    console.error('Jobber callback error:', err);
    res.status(500).send('Authorization failed');
  }
}
