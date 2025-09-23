// api/webhook-status-update.js - Update message status from Twilio webhooks
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Twilio webhook data
    const { MessageSid, MessageStatus, ErrorCode } = req.body;
    
    if (!MessageSid || !MessageStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Status update for ${MessageSid}: ${MessageStatus}`);

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Update status in Supabase
    const updateData = {
      "Status": MessageStatus
    };

    if (ErrorCode) {
      updateData["ErrorCode"] = parseInt(ErrorCode);
    }

    const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/sent_messages?Sid=eq.${MessageSid}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (supabaseResponse.ok) {
      console.log(`✅ Updated status for ${MessageSid} to ${MessageStatus}`);
      res.status(200).json({ success: true, updated: MessageSid });
    } else {
      const error = await supabaseResponse.text();
      console.error('Failed to update status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Status update failed' });
  }
}