// /api/quotes - Admin endpoint to list/manage quotes
// Requires authenticated session via Supabase Auth

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Verify the token is valid
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Use authenticated client for the request
  const authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  try {
    if (req.method === 'GET') {
      const { status, archived } = req.query;
      let query = authClient.from('quotes').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      if (archived === 'true') query = query.eq('archived', true);
      else query = query.eq('archived', false);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ quotes: data });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const updates = req.body;
      if (!id) return res.status(400).json({ error: 'Quote ID required' });

      // Whitelist of fields that can be updated
      const allowed = ['status', 'notes', 'final_price', 'archived'];
      const filtered = {};
      for (const k of allowed) if (k in updates) filtered[k] = updates[k];

      const { data, error } = await authClient
        .from('quotes')
        .update(filtered)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ quote: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Quote ID required' });
      const { error } = await authClient.from('quotes').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
