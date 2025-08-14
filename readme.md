# SMS Sender App 📱

A secure, production-ready SMS sending application built with Twilio and deployed on Vercel. Features password protection, rate limiting, and beautiful UI.

![SMS Sender App](https://img.shields.io/badge/Status-Production%20Ready-green)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)
![Twilio](https://img.shields.io/badge/Powered%20by-Twilio-red)

## 🚀 Features

- **8 Pre-built Templates**: Appointment reminders, order confirmations, payment reminders, and more
- **Dynamic Variables**: Personalize messages with template variables
- **Security Features**:
  - Password protection
  - Rate limiting (per hour/day)
  - Phone number whitelist (optional)
  - Content filtering (optional)
- **User Interface**:
  - Live message preview
  - Character/segment counter
  - Recent messages history
  - Daily statistics
  - International phone number support
- **Production Ready**:
  - Error handling
  - Input validation
  - Audit logging
  - CORS protection

## 📋 Prerequisites

- [Twilio Account](https://www.twilio.com/try-twilio) (free trial available)
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

### Step 2: Configure Twilio

1. Sign up for [Twilio](https://www.twilio.com/try-twilio)
2. Get your credentials from [Twilio Console](https://console.twilio.com):
   - Account SID
   - Auth Token
   - Phone Number

### Step 3: Deploy to Vercel

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

### Step 4: Set Environment Variables

In Vercel Dashboard or via CLI:

```bash
# Required
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN  
vercel env add TWILIO_PHONE_NUMBER
vercel env add APP_PASSWORD

# Optional (with defaults)
vercel env add DAILY_SMS_LIMIT      # Default: 100
vercel env add MAX_REQUESTS_PER_HOUR # Default: 10
```

### Step 5: Redeploy

```bash
vercel --prod
```

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

1. **Open your app**: `https://your-app.vercel.app`
2. **Select a template** from the dropdown
3. **Enter recipient's phone number**
4. **Fill in template variables**
5. **Enter your password**
6. **Click "Send SMS"**

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
| "Invalid password" | Check `APP_PASSWORD` in Vercel environment variables |
| "Phone number not verified" | For trial accounts, verify number in Twilio Console |
| "Rate limit exceeded" | Wait 1 hour or increase `MAX_REQUESTS_PER_HOUR` |
| "Daily limit reached" | Wait until tomorrow or increase `DAILY_SMS_LIMIT` |
| "Invalid phone number" | Use E.164 format: `+1234567890` |

### Debug Mode

Set `NODE_ENV=development` in environment variables for detailed error messages.

## 💰 Cost Estimation

- **Vercel**: Free tier includes 100GB bandwidth, 100k function invocations/month
- **Twilio**: ~$0.0079 per SMS in US (varies by country)
- **Example**: 100 SMS/day = ~$24/month

## 📈 Scaling to Production

1. **Upgrade Twilio Account**: Remove trial restrictions
2. **Add Custom Domain**: In Vercel settings
3. **Implement User Authentication**: Add login system
4. **Add Database**: Store message history
5. **Set Up Monitoring**: Add Sentry or similar
6. **Implement Webhooks**: Track delivery status

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
3. **Monitor usage** - Set up alerts in Twilio for unusual activity
4. **Test with small limits** - Start with low DAILY_SMS_LIMIT
5. **Verify recipients** - In trial mode, verify all recipient numbers

## 🎉 Ready to Go!

Your SMS app is now ready for production use. Remember to:
- ✅ Keep your passwords secure
- ✅ Monitor your usage and costs
- ✅ Update regularly for security patches
- ✅ Test thoroughly before increasing limits

---

Built with ❤️ using [Twilio](https://twilio.com) and [Vercel](https://vercel.com)