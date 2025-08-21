// api/test-supabase.js - Debug endpoint to test Supabase connection
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
    const { password } = req.query;
    const APP_PASSWORD = process.env.APP_PASSWORD;
    
    if (APP_PASSWORD && password !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get Supabase credentials
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const debug = {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_KEY,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      supabaseUrlPreview: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'Not set',
      timestamp: new Date().toISOString()
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ 
        error: 'Missing Supabase credentials',
        debug
      });
    }

    // Test connection to Supabase
    const testResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/incoming_messages?limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    debug.connectionTest = {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok
    };

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      debug.connectionTest.error = errorText;
      return res.status(500).json({ 
        error: 'Supabase connection failed',
        debug
      });
    }

    const testData = await testResponse.json();
    debug.connectionTest.recordCount = testData.length;

    res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      debug
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message,
      debug: {
        timestamp: new Date().toISOString()
      }
    });
  }
}