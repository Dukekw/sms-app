// api/get-messages.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check password
    const { password } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ 
        error: 'Database not configured',
        success: false 
      });
    }

    // Fetch messages from Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/incoming_messages?order=timestamp.desc&limit=100`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch messages',
        success: false 
      });
    }

    const messages = await supabaseResponse.json();
    
    // Transform to match frontend format
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      from: msg.from_number,
      to: msg.to_number,
      message: msg.message,
      timestamp: msg.timestamp,
      read: msg.read || false
    }));

    console.log(`Fetched ${formattedMessages.length} messages`);

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve messages',
      success: false
    });
  }
}
