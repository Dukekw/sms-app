// api/get-sent-messages.js - Get sent messages from Supabase database
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
    const { password, limit = '20' } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ 
        error: 'Database not configured',
        success: false 
      });
    }

    // Fetch sent messages from Supabase
    const supabaseUrl = `${SUPABASE_URL}/rest/v1/sent_messages?select=*&order=SentDate.desc,created_at.desc&limit=${parseInt(limit)}`;
    
    const supabaseResponse = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch sent messages from database',
        success: false,
        details: error
      });
    }

    const messages = await supabaseResponse.json();

    // Transform to match frontend format (keeping compatibility)
    const formattedMessages = messages.map(msg => ({
      id: msg.Sid,
      to: msg.To,
      message: msg.Body,
      status: msg.Status,
      timestamp: msg.SentDate || msg.created_at,
      direction: msg.Direction,
      errorCode: msg.ErrorCode,
      errorMessage: null, // Not stored in our table
      price: msg.Price,
      priceUnit: msg.PriceUnit
    }));

    console.log(`Fetched ${formattedMessages.length} sent messages from Supabase`);

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
      source: 'supabase'
    });

  } catch (error) {
    console.error('Error fetching sent messages:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve sent messages',
      success: false,
      details: error.message
    });
  }
}