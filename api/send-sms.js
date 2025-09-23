// api/send-sms.js
// Secured Twilio SMS API endpoint with multiple protection layers

export default async function handler(req, res) {
  // Enable CORS for your domain
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, to, message, templateUsed } = req.body;

    // ====== SECURITY LAYER 1: Password Protection ======
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      console.log('Failed auth attempt from IP:', req.headers['x-forwarded-for']);
      return res.status(401).json({ error: 'Invalid password' });
    }

    // ====== SECURITY LAYER 2: Input Validation ======
    if (!to || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: to and message' 
      });
    }

    // Validate message length
    if (message.length > 1600) {
      return res.status(400).json({ 
        error: 'Message too long (max 1600 characters)' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Use E.164 format: +1234567890' 
      });
    }

    // ====== SECURITY LAYER 3: Phone Number Whitelist ======
    const ALLOWED_NUMBERS = process.env.ALLOWED_NUMBERS?.split(',') || [];
    
    if (ALLOWED_NUMBERS.length > 0) {
      const isAllowed = ALLOWED_NUMBERS.some(allowed => 
        to.includes(allowed.replace(/\s/g, ''))
      );
      
      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'This phone number is not in the allowed recipients list' 
        });
      }
    }

    // ====== SECURITY LAYER 4: Rate Limiting ======
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     'unknown';
    
    // Simple in-memory rate limiting
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Initialize rate limit tracking
    global.rateLimits = global.rateLimits || {};
    global.rateLimits[clientIp] = global.rateLimits[clientIp] || [];
    
    // Clean old entries
    global.rateLimits[clientIp] = global.rateLimits[clientIp].filter(
      timestamp => timestamp > hourAgo
    );
    
    // Check rate limit
    const MAX_REQUESTS_PER_HOUR = parseInt(process.env.MAX_REQUESTS_PER_HOUR || '10');
    
    if (global.rateLimits[clientIp].length >= MAX_REQUESTS_PER_HOUR) {
      return res.status(429).json({ 
        error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_HOUR} messages per hour.` 
      });
    }

    // ====== SECURITY LAYER 5: Daily Limit ======
    const TODAY_KEY = new Date().toISOString().split('T')[0];
    global.dailyCount = global.dailyCount || {};
    
    // Reset counter if it's a new day
    if (global.dailyCountDate !== TODAY_KEY) {
      global.dailyCount = {};
      global.dailyCountDate = TODAY_KEY;
    }
    
    global.dailyCount[TODAY_KEY] = (global.dailyCount[TODAY_KEY] || 0);
    
    const DAILY_LIMIT = parseInt(process.env.DAILY_SMS_LIMIT || '100');
    
    if (global.dailyCount[TODAY_KEY] >= DAILY_LIMIT) {
      return res.status(429).json({ 
        error: `Daily limit of ${DAILY_LIMIT} messages reached. Try again tomorrow.` 
      });
    }

    // ====== SECURITY LAYER 6: Content Filtering ======
    const BLOCKED_WORDS = process.env.BLOCKED_WORDS?.split(',') || [];
    const messageLower = message.toLowerCase();
    
    for (const word of BLOCKED_WORDS) {
      if (word && messageLower.includes(word.toLowerCase().trim())) {
        return res.status(400).json({ 
          error: 'Message contains prohibited content' 
        });
      }
    }

    // ====== TWILIO INTEGRATION ======
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials in environment variables');
      return res.status(500).json({ 
        error: 'SMS service not configured. Please contact administrator.' 
      });
    }

    // Import Twilio SDK
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    // Log the attempt (for audit trail)
    console.log('SMS Request:', {
      to: to.slice(0, -4) + 'XXXX', // Partially hide number in logs
      template: templateUsed || 'unknown',
      messageLength: message.length,
      timestamp: new Date().toISOString(),
      ip: clientIp
    });

    // Send SMS via Twilio
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
      statusCallback: `${req.headers.origin || 'https://' + req.headers.host}/api/webhook-status-update`
    });

    // ====== SAVE TO SUPABASE DATABASE ======
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const supabaseData = {
          "From": fromNumber,
          "To": to,
          "Body": message,
          "Status": result.status,
          "SentDate": result.dateSent ? result.dateSent.toISOString() : new Date().toISOString(),
          "ApiVersion": result.apiVersion || '2010-04-01',
          "NumSegments": result.numSegments || 1,
          "ErrorCode": result.errorCode || null,
          "AccountSid": accountSid,
          "Sid": result.sid,
          "Direction": result.direction || 'outbound-api',
          "Price": result.price || null,
          "PriceUnit": result.priceUnit || 'USD',
          "ShortenedLinkEnabled": false,
          "ShortenedLinkFirstClicked": null
        };

        const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/sent_messages`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(supabaseData)
        });

        if (supabaseResponse.ok) {
          console.log('Message saved to Supabase successfully:', result.sid);
        } else {
          const error = await supabaseResponse.text();
          console.error('Failed to save message to Supabase:', error);
          // Don't fail the request if Supabase save fails - message was still sent
        }
      }
    } catch (supabaseError) {
      console.error('Supabase save error:', supabaseError);
      // Don't fail the request if Supabase save fails - message was still sent
    }

    // Update rate limiting
    global.rateLimits[clientIp].push(now);
    
    // Update daily count
    global.dailyCount[TODAY_KEY]++;
    
    // Calculate remaining messages
    const remainingToday = DAILY_LIMIT - global.dailyCount[TODAY_KEY];

    // Success response
    res.status(200).json({ 
      success: true, 
      messageId: result.sid,
      status: result.status,
      remainingToday: remainingToday,
      dailyLimit: DAILY_LIMIT
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Handle Twilio-specific errors
    if (error.code === 20003) {
      return res.status(401).json({ 
        error: 'Authentication failed. Please check Twilio credentials.' 
      });
    } else if (error.code === 21211) {
      return res.status(400).json({ 
        error: 'Invalid phone number. Please check the number and try again.' 
      });
    } else if (error.code === 21408) {
      return res.status(400).json({ 
        error: 'Permission to send to this region denied. Upgrade your Twilio account.' 
      });
    } else if (error.code === 21608) {
      return res.status(400).json({ 
        error: 'Phone number not verified. In trial mode, verify the number in Twilio console first.' 
      });
    } else if (error.code === 21610) {
      return res.status(400).json({ 
        error: 'Recipient has opted out of messages. Cannot send SMS to this number.' 
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Failed to send SMS. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}