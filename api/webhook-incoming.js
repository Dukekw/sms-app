// api/webhook-incoming.js
export default async function handler(req, res) {
  console.log('=== Incoming SMS Webhook Called ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  console.log('Query:', JSON.stringify(req.query));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { From, To, Body, MessageSid } = req.body;
    console.log('SMS from:', From, 'Message:', Body);

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase credentials');
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

    // Store in Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/incoming_messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          from_number: From,
          to_number: To,
          message: Body,
          message_sid: MessageSid,
          timestamp: new Date().toISOString(),
          read: false
        })
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase error:', error);
    } else {
      console.log('Message saved to Supabase');
    }

    // Return empty response to Twilio
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

  } catch (error) {
    console.error('Webhook error:', error);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
}
