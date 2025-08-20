// api/get-messages.js
// API endpoint to retrieve incoming messages from Supabase

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests (fetch messages)
  if (req.method === 'GET') {
    try {
      // Check for password authentication
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
      
      // Transform the data to match frontend format
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        from: msg.from_number,
        to: msg.to_number,
        message: msg.message,
        timestamp: msg.timestamp,
        read: msg.read || false,
        metadata: msg.metadata
      }));

      console.log(`Fetched ${formattedMessages.length} messages from Supabase`);

      res.status(200).json({
        success: true,
        messages: formattedMessages,
        count: formattedMessages.length
      });

    } catch (error) {
      console.error('Error retrieving messages:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve messages',
        details: error.message,
        success: false
      });
    }
  }
  
  // Handle POST requests (mark as read)
  else if (req.method === 'POST') {
    try {
      const { messageIds, password } = req.body;
      
      // Verify password
      const APP_PASSWORD = process.env.APP_PASSWORD;
      if (APP_PASSWORD && password !== APP_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Get Supabase credentials
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      // Update read status in Supabase
      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/incoming_messages?id=in.(${messageIds.join(',')})`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ read: true })
        }
      );

      if (!supabaseResponse.ok) {
        const error = await supabaseResponse.text();
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update read status' });
      }

      console.log(`Marked ${messageIds.length} messages as read`);
      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ error: 'Failed to update read status' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Optional: Delete old messages (cleanup function)
export async function cleanup(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, daysOld = 30 } = req.body;
    
    const APP_PASSWORD = process.env.APP_PASSWORD;
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/incoming_messages?timestamp=lt.${cutoffDate.toISOString()}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Cleanup error:', error);
      return res.status(500).json({ error: 'Failed to delete old messages' });
    }

    res.status(200).json({ 
      success: true,
      message: `Deleted messages older than ${daysOld} days`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
}
