// api/migrate-historical-messages.js - Import historical messages from Twilio to Supabase
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
    const { password, dryRun = false, limit = 1000 } = req.body;
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

    console.log(`Starting migration: ${dryRun ? 'DRY RUN' : 'LIVE'}, limit: ${limit}`);

    // ====== FETCH HISTORICAL MESSAGES FROM TWILIO ======
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    console.log('Fetching messages from Twilio...');
    const twilioMessages = await client.messages.list({
      from: TWILIO_PHONE_NUMBER,
      limit: parseInt(limit)
      // No date filter - get all historical messages
    });

    console.log(`Found ${twilioMessages.length} messages in Twilio`);

    if (twilioMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No historical messages found in Twilio',
        imported: 0,
        skipped: 0,
        errors: 0
      });
    }

    // ====== CHECK EXISTING MESSAGES IN SUPABASE ======
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/sent_messages?select=Sid`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existingMessages = existingResponse.ok ? await existingResponse.json() : [];
    const existingSids = new Set(existingMessages.map(msg => msg.Sid));
    
    console.log(`Found ${existingMessages.length} existing messages in Supabase`);

    // ====== PREPARE MIGRATION DATA ======
    const toImport = [];
    const skipped = [];
    
    twilioMessages.forEach(msg => {
      if (existingSids.has(msg.sid)) {
        skipped.push(msg.sid);
      } else {
        toImport.push({
          "From": msg.from,
          "To": msg.to,
          "Body": msg.body,
          "Status": msg.status,
          "SentDate": msg.dateSent ? msg.dateSent.toISOString() : null,
          "ApiVersion": msg.apiVersion || '2010-04-01',
          "NumSegments": msg.numSegments || 1,
          "ErrorCode": msg.errorCode || null,
          "AccountSid": TWILIO_ACCOUNT_SID,
          "Sid": msg.sid,
          "Direction": msg.direction || 'outbound-api',
          "Price": msg.price || null,
          "PriceUnit": msg.priceUnit || 'USD',
          "ShortenedLinkEnabled": false,
          "ShortenedLinkFirstClicked": null
        });
      }
    });

    console.log(`To import: ${toImport.length}, To skip: ${skipped.length}`);

    // ====== DRY RUN RESPONSE ======
    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        summary: {
          totalTwilioMessages: twilioMessages.length,
          existingInSupabase: existingMessages.length,
          toImport: toImport.length,
          toSkip: skipped.length
        },
        sampleMessages: toImport.slice(0, 3).map(msg => ({
          sid: msg.Sid,
          to: msg.To,
          body: msg.Body.substring(0, 50) + '...',
          sentDate: msg.SentDate
        })),
        message: `Ready to import ${toImport.length} messages. Set dryRun=false to proceed.`
      });
    }

    // ====== ACTUAL IMPORT ======
    if (toImport.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All messages already exist in Supabase',
        imported: 0,
        skipped: skipped.length,
        errors: 0
      });
    }

    console.log('Starting import to Supabase...');
    let imported = 0;
    let errors = 0;
    const errorDetails = [];

    // Import in batches of 100 to avoid overwhelming Supabase
    const batchSize = 100;
    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      
      try {
        const importResponse = await fetch(`${SUPABASE_URL}/rest/v1/sent_messages`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        });

        if (importResponse.ok) {
          imported += batch.length;
          console.log(`Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} messages`);
        } else {
          const error = await importResponse.text();
          console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
          errors += batch.length;
          errorDetails.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error}`);
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, batchError);
        errors += batch.length;
        errorDetails.push(`Batch ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // ====== FINAL RESPONSE ======
    const result = {
      success: true,
      message: `Migration completed: ${imported} imported, ${skipped.length} skipped, ${errors} errors`,
      summary: {
        totalTwilioMessages: twilioMessages.length,
        imported: imported,
        skipped: skipped.length,
        errors: errors
      },
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    };

    console.log('Migration completed:', result.summary);
    res.status(200).json(result);

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      success: false,
      details: error.message
    });
  }
}