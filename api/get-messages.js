export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for password/authentication
    const { password } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // ===== RETRIEVE MESSAGES FROM YOUR STORAGE =====
    
    let messages = [];

    // Option 1: From Vercel KV
    /*
    try {
      const kv = require('@vercel/kv');
      messages = await kv.get('incoming_messages') || [];
    } catch (kvError) {
      console.error('KV retrieval error:', kvError);
      messages = [];
    }
    */

    // Option 2: From external database
    /*
    try {
      const response = await fetch('https://your-database-api.com/messages', {
        headers: {
          'Authorization': `Bearer ${process.env.DATABASE_API_KEY}`
        }
      });
      messages = await response.json();
    } catch (dbError) {
      console.error('Database retrieval error:', dbError);
      messages = [];
    }
    */

    // For now, return demo messages if no storage is configured
    if (messages.length === 0) {
      messages = [
        {
          id: '1',
          from: '+12145551234',
          message: 'Configure Twilio webhook to receive real messages',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
    }

    res.status(200).json({
      success: true,
      messages: messages,
      count: messages.length
    });

  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve messages',
      details: error.message 
    });
  }
}

// Optional: Mark messages as read
export async function markAsRead(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messageIds, password } = req.body;
    
    // Verify password
    const APP_PASSWORD = process.env.APP_PASSWORD;
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update read status in your storage
    // Implementation depends on your storage solution

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to update read status' });
  }
}
