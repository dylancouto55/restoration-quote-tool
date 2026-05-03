export default async function handler(req, res) {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${encodeURIComponent(address)}&key=${apiKey}&source=outdoor`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Street View request failed' });
        }

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(buffer));
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch Street View image' });
    }
}
