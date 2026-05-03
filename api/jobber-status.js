import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ connected: false });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('jobber_tokens')
      .select('updated_at')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return res.status(200).json({ connected: false });
    }

    return res.status(200).json({
      connected: true,
      lastUpdated: data.updated_at,
    });
  } catch (err) {
    return res.status(200).json({ connected: false });
  }
}
