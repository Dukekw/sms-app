export default async function handler(req, res) {
  console.log('=== Incoming SMS Webhook Called ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
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

    // Log the incoming message
    console.log('Incoming SMS:', {
      from: From,
      to: To,
      message: Body,
      messageId: MessageSid,
      location: `${FromCity}, ${FromState} ${FromZip}, ${FromCountry}`
    });

    // Store the message (you'll need to implement your storage solution)
    const incomingMessage = {
      id: MessageSid,
      from: From,
      to: To,
      message: Body,
      timestamp: new Date().toISOString(),
      read: false,
      metadata: {
        city: FromCity,
        state: FromState,
        country: FromCountry,
        zip: FromZip,
        hasMedia: NumMedia > 0
      }
    };

    // ===== STORAGE OPTIONS =====
    
    // Option 1: Store in Vercel KV (Recommended for production)
    // Uncomment if you have Vercel KV set up:
    /*
    try {
      const kv = require('@vercel/kv');
      
      // Get existing messages
      const existingMessages = await kv.get('incoming_messages') || [];
      
      // Add new message
      existingMessages.unshift(incomingMessage);
      
      // Keep only last 100 messages
      if (existingMessages.length > 100) {
        existingMessages = existingMessages.slice(0, 100);
      }
      
      // Save back to KV
      await kv.set('incoming_messages', existingMessages);
      
      console.log('Message saved to Vercel KV');
    } catch (kvError) {
      console.error('KV Storage error:', kvError);
    }
    */

    // Option 2: Send to external database (Supabase, Firebase, etc.)
    // Example with fetch to your database API:
    /*
    try {
      await fetch('https://your-database-api.com/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DATABASE_API_KEY}`
        },
        body: JSON.stringify(incomingMessage)
      });
      console.log('Message saved to database');
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
    */

    // Option 3: Forward to a notification service (Discord, Slack, Email)
    // Example: Send to Discord webhook
    /*
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📱 New SMS from ${From}`,
            embeds: [{
              title: 'Incoming SMS',
              description: Body,
              color: 3447003,
              fields: [
                { name: 'From', value: From, inline: true },
                { name: 'Location', value: `${FromCity}, ${FromState}`, inline: true }
              ],
              timestamp: new Date().toISOString()
            }]
          })
        });
        console.log('Notification sent to Discord');
      } catch (discordError) {
        console.error('Discord notification error:', discordError);
      }
    }
    */

    // Check for STOP requests (opt-out)
    if (Body && Body.toUpperCase().trim() === 'STOP') {
      console.log('User requested to opt-out:', From);
      
      // Store opt-out status (implement your storage)
      // await saveOptOut(From);
      
      // Send confirmation (Twilio handles STOP automatically, but you can customize)
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>You have been unsubscribed from Cuchen SMS updates. Reply START to resubscribe.</Message>
        </Response>`);
    }

    // Check for START requests (opt-in)
    if (Body && Body.toUpperCase().trim() === 'START') {
      console.log('User requested to opt-in:', From);
      
      // Remove opt-out status (implement your storage)
      // await removeOptOut(From);
      
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Welcome back! You are now subscribed to Cuchen SMS updates.</Message>
        </Response>`);
    }

    // Auto-reply for business hours (optional)
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 18; // 9 AM to 6 PM
    
    if (!isBusinessHours) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Thank you for contacting Cuchen. We received your message and will respond during business hours (9 AM - 6 PM). For urgent matters, please call 888-742-2588.</Message>
        </Response>`);
    }

    // Standard response (empty response means no auto-reply)
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

// Optional: Verify webhook is from Twilio (recommended for production)
/*
import twilio from 'twilio';

function verifyTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.url}`;
  
  return twilio.validateRequest(
    authToken,
    signature,
    url,
    req.body
  );
}

// Add to handler:
if (!verifyTwilioSignature(req)) {
  console.warn('Invalid Twilio signature');
  return res.status(403).json({ error: 'Forbidden' });
}
*/
