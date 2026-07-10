// /api/settings - Get/save app configuration
// GET is public (customer form needs pricing config)
// PUT requires admin auth

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // GET - public, returns config
  if (req.method === 'GET') {
    // maps_key is the Google Maps key the customer form's satellite measure tool
    // loads client-side. Prefer a dedicated referrer-restricted browser key if
    // one is set; otherwise reuse the existing Maps key the quote tool already
    // uses server-side. Returned even if the config lookup fails, so the measure
    // tool keeps working (the form falls back to its built-in default rates).
    const maps_key = process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'config')
        .single();

      if (error) throw error;
      return res.status(200).json({ config: data?.value || {}, maps_key });
    } catch (err) {
      console.error('settings GET: config load failed:', err.message);
      return res.status(200).json({ config: {}, maps_key, config_error: err.message });
    }
  }

  // PUT - requires auth, updates config
  if (req.method === 'PUT') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid config payload' });
    }

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'config', value: config, updated_at: new Date().toISOString() });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
