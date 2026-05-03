export default async function handler(req, res) {
  const clientId = process.env.JOBBER_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'JOBBER_CLIENT_ID not configured' });
  }

  const redirectUri = encodeURIComponent(
    'https://restoration-quote-tool.vercel.app/api/jobber-callback'
  );

  // Generate a simple state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl =
    `https://api.getjobber.com/api/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}`;

  // Redirect the user to Jobber's authorization page
  res.redirect(302, authUrl);
}
