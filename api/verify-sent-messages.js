// api/verify-sent-messages.js - Compare Supabase sent messages with Twilio data
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
    const { password, limit = '50', days = '7' } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ 
        error: 'Supabase not configured',
        success: false 
      });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ 
        error: 'Twilio not configured',
        success: false 
      });
    }

    console.log(`Starting verification: comparing last ${days} days, limit ${limit} messages`);

    // ====== FETCH FROM SUPABASE ======
    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const supabaseUrl = `${SUPABASE_URL}/rest/v1/sent_messages?select=*&SentDate=gte.${daysAgo.toISOString()}&order=SentDate.desc&limit=${parseInt(limit)}`;
    
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
      return res.status(500).json({ 
        error: 'Failed to fetch from Supabase',
        details: error
      });
    }

    const supabaseMessages = await supabaseResponse.json();

    // ====== FETCH FROM TWILIO ======
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const twilioMessages = await client.messages.list({
      from: TWILIO_PHONE_NUMBER,
      limit: parseInt(limit),
      dateSentAfter: daysAgo
    });

    // ====== COMPARE DATA ======
    const comparison = {
      supabaseCount: supabaseMessages.length,
      twilioCount: twilioMessages.length,
      missingInSupabase: [],
      missingInTwilio: [],
      discrepancies: [],
      matches: 0
    };

    // Create lookup maps
    const supabaseMap = new Map();
    supabaseMessages.forEach(msg => {
      supabaseMap.set(msg.Sid, msg);
    });

    const twilioMap = new Map();
    twilioMessages.forEach(msg => {
      twilioMap.set(msg.sid, msg);
    });

    // Check for messages in Twilio but missing in Supabase
    twilioMessages.forEach(twilioMsg => {
      const supabaseMsg = supabaseMap.get(twilioMsg.sid);
      
      if (!supabaseMsg) {
        comparison.missingInSupabase.push({
          sid: twilioMsg.sid,
          to: twilioMsg.to,
          body: twilioMsg.body.substring(0, 50) + '...',
          status: twilioMsg.status,
          dateSent: twilioMsg.dateSent?.toISOString()
        });
      } else {
        // Compare key fields for discrepancies
        const discrepancies = [];
        
        if (supabaseMsg.To !== twilioMsg.to) {
          discrepancies.push(`To: DB="${supabaseMsg.To}" vs Twilio="${twilioMsg.to}"`);
        }
        
        if (supabaseMsg.Body !== twilioMsg.body) {
          discrepancies.push(`Body: Different content (DB: ${supabaseMsg.Body.length} chars, Twilio: ${twilioMsg.body.length} chars)`);
        }
        
        if (supabaseMsg.Status !== twilioMsg.status) {
          discrepancies.push(`Status: DB="${supabaseMsg.Status}" vs Twilio="${twilioMsg.status}"`);
        }

        if (supabaseMsg.Price !== twilioMsg.price) {
          discrepancies.push(`Price: DB="${supabaseMsg.Price}" vs Twilio="${twilioMsg.price}"`);
        }

        if (discrepancies.length > 0) {
          comparison.discrepancies.push({
            sid: twilioMsg.sid,
            issues: discrepancies
          });
        } else {
          comparison.matches++;
        }
      }
    });

    // Check for messages in Supabase but missing in Twilio (shouldn't happen, but good to check)
    supabaseMessages.forEach(supabaseMsg => {
      if (!twilioMap.has(supabaseMsg.Sid)) {
        comparison.missingInTwilio.push({
          sid: supabaseMsg.Sid,
          to: supabaseMsg.To,
          body: supabaseMsg.Body.substring(0, 50) + '...',
          status: supabaseMsg.Status,
          dateSent: supabaseMsg.SentDate
        });
      }
    });

    // ====== GENERATE REPORT ======
    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      parameters: {
        days: parseInt(days),
        limit: parseInt(limit)
      },
      summary: {
        supabaseCount: comparison.supabaseCount,
        twilioCount: comparison.twilioCount,
        matches: comparison.matches,
        missingInSupabaseCount: comparison.missingInSupabase.length,
        missingInTwilioCount: comparison.missingInTwilio.length,
        discrepanciesCount: comparison.discrepancies.length
      },
      details: {
        missingInSupabase: comparison.missingInSupabase,
        missingInTwilio: comparison.missingInTwilio,
        discrepancies: comparison.discrepancies
      },
      healthScore: comparison.matches / Math.max(comparison.twilioCount, 1) * 100
    };

    // Log summary
    console.log('Verification Summary:', {
      supabase: comparison.supabaseCount,
      twilio: comparison.twilioCount,
      matches: comparison.matches,
      missing: comparison.missingInSupabase.length,
      discrepancies: comparison.discrepancies.length,
      healthScore: report.healthScore.toFixed(1) + '%'
    });

    res.status(200).json(report);

  } catch (error) {
    console.error('Error during verification:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      success: false,
      details: error.message
    });
  }
}