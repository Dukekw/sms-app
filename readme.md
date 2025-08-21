# Cuchen SMS System 📱

A complete two-way SMS communication system built with Twilio, Supabase, and deployed on Vercel. Send messages using pre-built templates and receive/manage incoming messages with a beautiful web interface.

![SMS System](https://img.shields.io/badge/Status-Production%20Ready-green)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)
![Twilio](https://img.shields.io/badge/Powered%20by-Twilio-red)
![Supabase](https://img.shields.io/badge/Database-Supabase-green)

## 🚀 Features

### 📤 Outgoing Messages
- **8 Pre-built Templates**: Cuchen repair service templates including receipt confirmations, cost notices, location notices, and custom messages
- **Dynamic Variables**: Personalize messages with customer names, costs, locations, etc.
- **Live Preview**: See exactly how your message will look before sending
- **Character/Segment Counter**: Track SMS length and costs

### 📥 Incoming Messages  
- **Real-time Message Reception**: Receive and store incoming SMS messages via Twilio webhooks
- **Conversation View**: Organized by phone number with message history
- **Quick Reply**: Respond directly from the web interface
- **Message Status**: Track read/unread status
- **Search & Filter**: Find conversations quickly

### 🔒 Security Features
- **Password Protection**: Secure access to the application
- **Rate Limiting**: Per hour/day limits to prevent abuse
- **Phone Number Whitelist**: Optional restriction to specific recipients
- **Content Filtering**: Block messages containing prohibited words
- **Audit Logging**: Track all message activity

### 💾 Database Integration
- **Supabase Backend**: Reliable cloud database for message storage
- **Message History**: Persistent storage of all incoming messages
- **Real-time Sync**: Messages appear instantly in the web interface

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface built with Tailwind CSS
- **Message Statistics**: Daily/total message counters
- **International Support**: Handle phone numbers from multiple countries
- **Mobile Friendly**: Works perfectly on all devices

## 📋 Prerequisites

- [Twilio Account](https://www.twilio.com/try-twilio) (free trial available)
- [Supabase Account](https://supabase.com) (free tier available)
- [Vercel Account](https://vercel.com/signup) (free)
- [GitHub Account](https://github.com/signup) (free)
- [Node.js](https://nodejs.org/) installed locally (for testing)

## 🛠️ Quick Setup

### Step 1: Fork/Clone this Repository

1. Click "Use this template" or fork this repository
2. Clone to your local machine:
```bash
git clone https://github.com/YOUR_USERNAME/sms-app.git
cd sms-app
```

### Step 2: Set Up Supabase Database

1. Sign up for [Supabase](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run this query to create the messages table:

```sql
CREATE TABLE incoming_messages (
  id BIGSERIAL PRIMARY KEY,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_sid TEXT UNIQUE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Add index for better performance
CREATE INDEX idx_incoming_messages_from_number ON incoming_messages(from_number);
CREATE INDEX idx_incoming_messages_timestamp ON incoming_messages(timestamp DESC);
```

4. Get your credentials from Settings → API:
   - Project URL
   - Service Role Key (not anon key!)

### Step 3: Configure Twilio

1. Sign up for [Twilio](https://www.twilio.com/try-twilio)
2. Get your credentials from [Twilio Console](https://console.twilio.com):
   - Account SID
   - Auth Token
   - Phone Number
3. **Important**: You'll configure the webhook URL after deployment

### Step 4: Deploy to Vercel

#### Option A: Deploy with Vercel Button (Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/sms-app)

#### Option B: Deploy via CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to link your project

### Step 5: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
# Twilio Configuration (Required)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Security (Required)
APP_PASSWORD=your_secure_password

# Rate Limiting (Optional - with defaults)
DAILY_SMS_LIMIT=100
MAX_REQUESTS_PER_HOUR=10

# Advanced Security (Optional)
ALLOWED_NUMBERS=+1234567890,+0987654321
ALLOWED_ORIGINS=https://yourdomain.com
BLOCKED_WORDS=spam,casino,lottery
```

**Important**: Use the **Service Role Key** from Supabase, not the anon key!

### Step 6: Configure Twilio Webhook

After deployment:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Manage → Active numbers
3. Click on your SMS-enabled phone number
4. In the "Messaging" section, set:
   - **A message comes in**: `https://your-app.vercel.app/api/webhook-incoming`
   - **HTTP Method**: POST
5. Save the configuration

### Step 7: Test Your Setup

1. **Test database connection**:
   ```
   https://your-app.vercel.app/api/test-supabase?password=YOUR_PASSWORD
   ```

2. **Send a test SMS** to your Twilio number
3. **Check incoming messages** in your web app
4. **Send an outgoing message** using the web interface

## 🔐 Security Configuration

### Basic Security (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_PASSWORD` | Password to access the app | `MyS3cur3P@ss!` |
| `DAILY_SMS_LIMIT` | Max messages per day | `100` |
| `MAX_REQUESTS_PER_HOUR` | Max messages per hour per IP | `10` |

### Advanced Security (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_NUMBERS` | Whitelist phone numbers | `+1234567890,+0987654321` |
| `ALLOWED_ORIGINS` | CORS whitelist | `https://yourdomain.com` |
| `BLOCKED_WORDS` | Filter message content | `spam,casino,lottery` |

## 📱 Usage

### Sending Messages
1. **Open your app**: `https://your-app.vercel.app`
2. **Enter your password** (required for all operations)
3. **Select a template** from the dropdown (Receipt Confirmation, Cost Notice, etc.)
4. **Enter recipient's phone number** with country code
5. **Fill in template variables** (cost, location, etc.)
6. **Preview your message** in the right panel
7. **Click "Send SMS"**

### Managing Incoming Messages
1. **View incoming messages** in the bottom panel
2. **Click on a phone number** to see the conversation
3. **Use quick reply** to respond directly
4. **Search conversations** using the search box
5. **Messages are automatically marked as read** when viewed

### Available Templates
- **Receipt Confirmation**: Automated confirmation of repair requests
- **Cost Notice**: Repair cost and shipping fee notifications  
- **Location Notices**: West/East center addresses for carry-in customers
- **Documentation Requests**: Photo and receipt requests
- **Follow-up Messages**: Missed call notifications
- **Custom Message**: Write your own message

## 🧪 Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## 📊 Monitoring

### View Logs
```bash
vercel logs
```

### Check Function Usage
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Select your project
- Click "Functions" tab

### Monitor Twilio Usage
- [Twilio Console](https://console.twilio.com)
- Monitor → Logs → Messages

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Database not configured" | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel |
| "Invalid password" | Check `APP_PASSWORD` in Vercel environment variables |
| "Phone number not verified" | For trial accounts, verify number in Twilio Console |
| "Rate limit exceeded" | Wait 1 hour or increase `MAX_REQUESTS_PER_HOUR` |
| "Daily limit reached" | Wait until tomorrow or increase `DAILY_SMS_LIMIT` |
| "Invalid phone number" | Use E.164 format: `+1234567890` |
| "Incoming messages not showing" | Check Twilio webhook URL and Vercel function logs |
| "Webhook not receiving messages" | Ensure webhook URL uses HTTPS and is publicly accessible |

### Debug Endpoints

- **Test Supabase**: `/api/test-supabase?password=YOUR_PASSWORD`
- **Get Messages**: `/api/get-messages?password=YOUR_PASSWORD`
- **Check Webhook**: Look for POST requests in Vercel function logs

### Debug Mode

Set `NODE_ENV=development` in environment variables for detailed error messages.

## 💰 Cost Estimation

- **Vercel**: Free tier includes 100GB bandwidth, 100k function invocations/month
- **Supabase**: Free tier includes 500MB database, 2GB bandwidth/month
- **Twilio**: ~$0.0079 per SMS in US (varies by country)
- **Example**: 100 SMS/day = ~$24/month (Twilio only, other services free on basic usage)

## 📈 Scaling to Production

1. **Upgrade Twilio Account**: Remove trial restrictions
2. **Upgrade Supabase**: Increase database limits if needed
3. **Add Custom Domain**: In Vercel settings
4. **Implement User Authentication**: Add multi-user support
5. **Set Up Monitoring**: Add Sentry or similar for error tracking
6. **Add Message Analytics**: Track delivery rates and response times
7. **Implement Message Templates Management**: Allow dynamic template creation
8. **Add File Attachments**: Support for images and documents

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README
- **Vercel Issues**: [Vercel Support](https://vercel.com/support)
- **Twilio Issues**: [Twilio Support](https://support.twilio.com)
- **Bug Reports**: Open an issue in this repository

## 🔄 Updates

To update to the latest version:

```bash
git pull origin main
vercel --prod
```

## ⚠️ Important Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong passwords** - Your APP_PASSWORD protects against unauthorized use
3. **Use Service Role Key** - Not the anon key for Supabase (required for write access)
4. **Monitor usage** - Set up alerts in Twilio and Supabase for unusual activity
5. **Test with small limits** - Start with low DAILY_SMS_LIMIT
6. **Verify recipients** - In trial mode, verify all recipient numbers in Twilio
7. **Secure your webhook** - The webhook endpoint is public but validates Twilio requests
8. **Backup your database** - Supabase provides automatic backups, but consider additional backups for critical data

## 🎉 Ready to Go!

Your SMS app is now ready for production use. Remember to:
- ✅ Keep your passwords secure
- ✅ Monitor your usage and costs
- ✅ Update regularly for security patches
- ✅ Test thoroughly before increasing limits

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Vercel Edge    │    │    Supabase     │
│                 │◄──►│                  │◄──►│    Database     │
│  - Send SMS     │    │  - API Routes    │    │  - Messages     │
│  - View Messages│    │  - Static Files  │    │  - History      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │      Twilio      │
                       │                  │
                       │  - Send SMS      │
                       │  - Receive SMS   │
                       │  - Webhooks      │
                       └──────────────────┘
```

## 🔄 Message Flow

### Outgoing Messages
1. User fills form → Frontend validates → API processes → Twilio sends → Database logs

### Incoming Messages  
1. SMS received → Twilio webhook → API stores in database → Frontend displays

---

Built with ❤️ using [Twilio](https://twilio.com), [Supabase](https://supabase.com), and [Vercel](https://vercel.com)