// /api/lookup - RentCast Property Lookup Proxy
// Keeps the API key server-side so it stays secret.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;

  if (!address || address.length < 5) {
    return res.status(400).json({
      found: false,
      error: 'Please provide a full address with street, city, and state'
    });
  }

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      found: false,
      error: 'API key not configured. Add RENTCAST_API_KEY in Vercel environment variables.'
    });
  }

  try {
    const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        found: false,
        error: `RentCast API error (${response.status}): ${errText.slice(0, 200)}`
      });
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json({
        found: false,
        error: 'No property found. Try including the ZIP code.'
      });
    }

    const prop = data[0];
    const result = {
      found: true,
      sqft: prop.squareFootage || null,
      stories: prop.stories || guessStoriesFromType(prop.architectureType),
      bedrooms: prop.bedrooms || null,
      bathrooms: prop.bathrooms || null,
      year_built: prop.yearBuilt || null,
      lot_size: prop.lotSize || null,
      property_type: prop.propertyType || null,
      address: prop.formattedAddress || address,
      source: 'RentCast'
    };

    if (!result.sqft) {
      return res.status(200).json({
        found: false,
        error: 'Property found but no square footage on file. Enter manually.'
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      found: false,
      error: 'Lookup failed: ' + err.message
    });
  }
}

function guessStoriesFromType(type) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('ranch') || t.includes('bungalow')) return 1;
  if (t.includes('cape') || t.includes('split')) return 1.5;
  if (t.includes('colonial') || t.includes('two') || t.includes('2-story')) return 2;
  if (t.includes('three') || t.includes('3-story')) return 3;
  return null;
}
