// api/sync-message-status.js - Sync message statuses from Twilio to Supabase
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check password
    const { password, hours = 24 } = req.body;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }

    console.log(`Starting status sync for last ${hours} hours`);

    // Get recent messages from Supabase that might need status updates
    const hoursAgo = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    const supabaseUrl = `${SUPABASE_URL}/rest/v1/sent_messages?select=Sid,Status&SentDate=gte.${hoursAgo.toISOString()}&Status=in.(queued,sending,sent)&order=SentDate.desc`;
    
    const supabaseResponse = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseResponse.ok) {
      throw new Error('Failed to fetch messages from Supabase');
    }

    const supabaseMessages = await supabaseResponse.json();
    console.log(`Found ${supabaseMessages.length} messages to check`);

    if (supabaseMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No messages need status updates',
        checked: 0,
        updated: 0
      });
    }

    // Get current status from Twilio
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    let updated = 0;
    let errors = 0;

    for (const msg of supabaseMessages) {
      try {
        // Get current status from Twilio
        const twilioMessage = await client.messages(msg.Sid).fetch();
        
        // If status changed, update in Supabase
        if (twilioMessage.status !== msg.Status) {
          const updateData = {
            "Status": twilioMessage.status,
            "ErrorCode": twilioMessage.errorCode || null
          };

          const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/sent_messages?Sid=eq.${msg.Sid}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData)
          });

          if (updateResponse.ok) {
            console.log(`✅ Updated ${msg.Sid}: ${msg.Status} → ${twilioMessage.status}`);
            updated++;
          } else {
            console.error(`❌ Failed to update ${msg.Sid}`);
            errors++;
          }
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error checking ${msg.Sid}:`, error.message);
        errors++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Status sync completed: ${updated} updated, ${errors} errors`,
      checked: supabaseMessages.length,
      updated: updated,
      errors: errors
    });

  } catch (error) {
    console.error('Status sync error:', error);
    res.status(500).json({ 
      error: 'Status sync failed',
      details: error.message
    });
  }
}