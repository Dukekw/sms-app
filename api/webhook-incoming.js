// api/webhook-incoming.js
// Webhook endpoint to receive incoming SMS from Twilio and store in Supabase

export default async function handler(req, res) {
  console.log('=== Incoming SMS Webhook Called ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body));

  // Only accept POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract SMS data from Twilio's request
    const {
      From,        // Phone number that sent the message
      To,          // Your Twilio phone number
      Body,        // Message content
      MessageSid,  // Unique message ID
      NumMedia,    // Number of media attachments
      FromCity,
      FromState,
      FromCountry,
      FromZip
    } = req.body;

    console.log('Incoming SMS from:', From, 'Message:', Body);

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase credentials');
      // Still return success to Twilio to prevent retries
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response></Response>`);
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
          read: false,
          metadata: {
            city: FromCity,
            state: FromState,
            country: FromCountry,
            zip: FromZip,
            has_media: NumMedia > 0
          }
        })
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase error:', error);
    } else {
      console.log('Message saved to Supabase successfully');
      const savedMessage = await supabaseResponse.json();
      console.log('Saved message ID:', savedMessage[0]?.id);
    }

    // Handle STOP requests (opt-out)
    if (Body && Body.toUpperCase().trim() === 'STOP') {
      console.log('User requested opt-out:', From);
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>You've been unsubscribed from Cuchen SMS updates. Reply START to resubscribe.</Message>
        </Response>`);
    }

    // Handle START requests (opt-in)
    if (Body && Body.toUpperCase().trim() === 'START') {
      console.log('User requested opt-in:', From);
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Welcome back! You're now subscribed to Cuchen SMS updates.</Message>
        </Response>`);
    }

    // Check for business hours auto-reply (optional)
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 18; // 9 AM to 6 PM
    
    if (!isBusinessHours) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Thanks for contacting Cuchen. We received your message and will respond during business hours (9 AM - 6 PM). For urgent matters, call 888-742-2588.</Message>
        </Response>`);
    }

    // Standard response (empty = no auto-reply)
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>`);

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Still return 200 to Twilio to prevent retries
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>`);
  }
}
