// /api/keepalive - Daily ping so the Supabase project doesn't pause for inactivity
// Called by the Vercel cron in vercel.json. Safe to open in a browser to check status.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { error } = await supabase
      .from('settings')
      .select('key')
      .eq('key', 'config')
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, checked_at: new Date().toISOString() });
  } catch (err) {
    console.error('keepalive: database unreachable:', err.message);
    return res.status(503).json({ ok: false, error: err.message, checked_at: new Date().toISOString() });
  }
}
