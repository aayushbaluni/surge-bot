# SURGE Bot - AI Trading Signals Telegram Bot

Power your trades with SURGE: AI-driven signals, private communities & seamless SOL payments—all inside Telegram.

## 🚀 Features

- **AI Trading Signals**: 96%+ accuracy trading signals with multi-tier TP/SL
- **Solana Payments**: Seamless SOL-based subscription payments
- **Private Communities**: Access to exclusive Telegram groups
- **Referral Program**: 10% commission on referrals
- **Real-time Dashboard**: Performance metrics and analytics
- **Multi-tier Plans**: Monthly, 6-Month, Yearly, and Lifetime subscriptions

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB database
- Telegram Bot Token
- Solana wallet for payments
- QuickNode RPC endpoint (optional)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```

4. **Configure your environment** (see Environment Configuration below)

5. **Build and start the bot**
   ```bash
   npm run build
   npm start
   ```

## ⚙️ Environment Configuration

### Required Variables

Create a `.env` file with the following required variables:

```env
# Bot Configuration (REQUIRED)
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_CHAT_ID=your_admin_telegram_id_here
CHANNEL_USERNAME=your_channel_username_here

# Solana Configuration (REQUIRED)
SOLANA_WALLET_ADDRESS=your_solana_wallet_address_here
```

### Optional Variables

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/surgebot

# Solana RPC
QUICKNODE_RPC_URL=https://ancient-fittest-field.solana-mainnet.quiknode.pro/52870c0fa2aaa478e5e8846f961685fa4eafbe02/

# External APIs
COINGECKO_API_KEY=your_coingecko_pro_api_key_here
NEWS_API_KEY=your_news_api_key_here

# Support & Links
SUPPORT_EMAIL=support@surge-ai.com
WEBSITE_URL=https://surge-ai.com
TWITTER_URL=https://twitter.com/SURGE_AI
TELEGRAM_CHANNEL=https://t.me/surge_announcements
SURGE_ANNOUNCEMENTS_CHANNEL=https://t.me/surge_announcements

# Private Group Links
PRIVATE_GROUP_LINK=https://t.me/+SURGEPrivateGroup
ELITE_GROUP_LINK=https://t.me/+SURGEEliteGroup
ADVANCED_NETWORK_LINK=https://t.me/+SURGEAdvancedNetwork

# Runtime Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## 🔧 Getting Required Values

### BOT_TOKEN
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Follow the instructions and copy the token

### ADMIN_CHAT_ID
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. Copy your user ID number

### CHANNEL_USERNAME
Your Telegram channel username (without @)

### SOLANA_WALLET_ADDRESS
Your Solana wallet address for receiving payments

## 📁 Project Structure

```
src/
├── config/
│   └── env.ts              # Environment configuration
├── commands/
│   ├── start.ts            # Welcome flow & payment processing
│   ├── surge.ts            # Core SURGE functionality
│   ├── plans.ts            # Subscription plans
│   ├── payment.ts          # Payment handling
│   ├── faq.ts              # FAQ system
│   ├── help.ts             # Help commands
│   ├── admin.ts            # Admin commands
│   └── referral.ts         # Referral system
├── utils/
│   ├── logger.ts           # Logging configuration
│   └── solana.ts           # Solana utilities
├── database.ts             # MongoDB models
├── types.ts                # TypeScript types
└── index.ts                # Main bot entry point
```

## 🤖 Bot Commands

### User Commands
- `/start` - Welcome & registration
- `/menu` - Main navigation menu
- `/signals` - View AI trading signals
- `/dashboard` - Performance metrics
- `/subscription` - Manage subscription
- `/settings` - Update preferences
- `/help` - Help and support
- `/faq` - Frequently asked questions
- `/invite` - Share referral link
- `/terms` - Terms of service
- `/privacy` - Privacy policy

### Admin Commands
- `/stats` - Bot statistics
- `/broadcast <message>` - Send message to all users
- `/user <id|username>` - User lookup
- `/verify_payment <txid>` - Verify payment
- `/debug` - Debug information

## 💰 Subscription Plans

| Plan | Price | Duration | Features |
|------|-------|----------|----------|
| Monthly | 1 SOL | 30 days | Basic signals + private group |
| 6-Month | 4.5 SOL | 180 days | All features + elite group (Save 25%) |
| Yearly | 8 SOL | 365 days | All features + priority support (Save 33%) |
| Lifetime | 10 SOL | Lifetime | All features + VIP access (Limited 100 seats) |

## 🔄 Development

### Scripts
```bash
npm run build      # Build TypeScript
npm run dev        # Development mode with auto-reload
npm start          # Production mode
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

### Environment Validation

The bot automatically validates environment variables on startup:
- ✅ Required variables are checked
- ✅ Format validation (BOT_TOKEN, ADMIN_CHAT_ID)
- ✅ Comprehensive logging of configuration status
- ✅ Graceful error handling with helpful messages

### Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development mode

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set up proper Solana wallet
4. Configure QuickNode RPC endpoint
5. Set up monitoring and alerts
6. Enable log rotation

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

## 🔒 Security

- Environment variables are validated and sanitized
- Admin commands require authentication
- Payment verification with Solana blockchain
- Secure session management
- Input validation and sanitization

## 📊 Monitoring

The bot includes comprehensive logging:
- User interactions and commands
- Payment processing and verification
- Error tracking and debugging
- Performance metrics
- Admin notifications

## 🆘 Support

- **Email**: support@surge-ai.com
- **Telegram**: [@SURGESupport](https://t.me/SURGESupport)
- **Channel**: [@surge_announcements](https://t.me/surge_announcements)
- **Website**: [surge-ai.com](https://surge-ai.com)

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ for the SURGE community** 