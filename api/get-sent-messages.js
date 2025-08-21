// api/get-sent-messages.js - Get sent messages from Twilio
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
    const { password, limit = '20' } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials');
      return res.status(500).json({ 
        error: 'Twilio not configured',
        success: false 
      });
    }

    // Import Twilio SDK
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    // Fetch sent messages from Twilio
    const messages = await client.messages.list({
      from: fromNumber,
      limit: parseInt(limit),
      // Get messages from the last 30 days
      dateSentAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });

    // Transform to match frontend format
    const formattedMessages = messages.map(msg => ({
      id: msg.sid,
      to: msg.to,
      message: msg.body,
      status: msg.status,
      timestamp: msg.dateSent ? msg.dateSent.toISOString() : new Date().toISOString(),
      direction: msg.direction,
      errorCode: msg.errorCode,
      errorMessage: msg.errorMessage,
      price: msg.price,
      priceUnit: msg.priceUnit
    }));

    console.log(`Fetched ${formattedMessages.length} sent messages from Twilio`);

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
      fromNumber: fromNumber
    });

  } catch (error) {
    console.error('Error fetching sent messages:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve sent messages',
      success: false,
      details: error.message
    });
  }
}