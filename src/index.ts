import { Telegraf, session } from 'telegraf';
import { setupStartCommand } from './commands/start';
import { setupPlanCommands } from './commands/plans';
import { setupPaymentCommands } from './commands/payment';
import { setupHelpCommand } from './commands/help';
import { setupAdminCommands } from './commands/admin';
import { setupAffiliateCommands } from './commands/affiliate';
import { setupSurgeCommands } from './commands/surge';
import { setupFaqCommand } from './commands/faq';
import { setupMiddleware } from './middleware';
import { logger } from './utils/logger';
import { connectDatabase } from './database';
import { Context } from './types';
import { ENV, BOT_TOKEN, isProduction } from './config/env';
import { User, AffiliateReward } from './database';

logger.info('Starting to import setupSubscriptionCommand...');
import { setupSubscriptionCommand } from './commands/subscription';
logger.info('Successfully imported setupSubscriptionCommand');

// Define bot commands
const BOT_COMMANDS = [
  { command: 'start', description: 'Start the bot and view welcome message' },
  { command: 'menu', description: 'Show main menu' },
  { command: 'subscription', description: 'Manage your subscription' },
  { command: 'renew', description: 'Renew your current plan' },
  { command: 'faq', description: 'Frequently asked questions' },
  { command: 'joinchannel', description: 'Join official announcements channel' },
  { command: 'affiliate', description: 'View affiliate program and earnings' },
  { command: 'twitter', description: 'Follow SURGE on Twitter' },
  { command: 'invite', description: 'Send bot invitation link to friends' },
  { command: 'terms', description: 'Terms of service' },
  { command: 'privacy', description: 'Privacy policy' },
  { command: 'help', description: 'Get help and view all commands' },
  { command: 'debug', description: 'Debug information (admin only)' }
];

// Initialize bot with custom context
logger.info('Initializing bot with token...');
const bot = new Telegraf<Context>(BOT_TOKEN);
logger.info('Bot initialized successfully');

// Add direct command handler for dashboard
bot.command('dashboard', async (ctx) => {
  logger.info('Direct dashboard command received');
  try {
    await ctx.reply('🚧 Dashboard is currently under maintenance. Please check back later.');
  } catch (error) {
    logger.error('Error in direct dashboard command:', error);
    await ctx.reply('Error loading dashboard. Please try again.');
  }
});

// Add direct command handler for FAQ
bot.command('faq', async (ctx) => {
  logger.info('Direct FAQ command received');
  try {
    if (!ctx.from) {
      logger.error('No user context in FAQ command');
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const faqMessage = `📚 **Frequently Asked Questions**

### 1. Q: What exactly do I get after I purchase a plan?
*A:* Upon completing your purchase, you will receive an email with instructions on how to gain instant access to the SURGE Trading Suite indicators within your TradingView account. You will also get an exclusive invitation to our private members-only community for trading insights and support.

### 2. Q: I'm new to trading. Is the SURGE suite suitable for beginners?
*A:* Absolutely. We designed the suite to be powerful for experts yet simple for beginners. The *SURGE AI MAX ALGO* in particular, with its Smart Dashboard and clear ⁠ BUY ⁠/⁠ SELL ⁠ commands, is the perfect starting point for new traders. As you learn, the more advanced features will be there for you to grow into.

### 3. Q: Which platform do these indicators work on?
*A:* The SURGE Trading Suite is designed exclusively for the *TradingView* platform. It will not work on MT4, MT5, or any other charting platform.

### 4. Q: Do I need a paid TradingView plan to use these indicators?
*A:* No. All of our indicators work perfectly on the *free Basic plan* offered by TradingView. You do not need to purchase a paid plan to use our suite.

### 5. Q: What markets and timeframes can I use this on?
*A:* Our suite is designed to work on *all markets* available on TradingView, including Forex, Crypto, Stocks, Indices, and Commodities. It is also effective on *all timeframes*, from 1-minute scalping to daily swing trading.

### 6. Q: What is the difference between the Lifetime and Subscription plans?
*A:* The *Monthly* and *Yearly* plans give you full access to the suite for the duration of your subscription. The *Lifetime* plan is a one-time payment that gives you permanent access to the entire suite, including all future updates and any new indicators we release, forever.

### 7. Q: How do I receive updates to the indicators?
*A:* All updates are pushed automatically to your TradingView account. When we release a new version, you'll see an update notification on your chart. There is no manual installation required. Lifetime members receive all future updates at no extra cost.

### 8. Q: Does this suite guarantee profits?
*A:* No tool can guarantee profits in financial markets. The SURGE Trading Suite is a powerful set of analytical indicators designed to give you a significant edge and clear insight into market dynamics. We always recommend pairing our tools with proper risk management and a solid trading plan.

### 9. Q: What kind of support do you offer?
*A:* We offer 24/7 support through our private members-only community (Discord/Telegram) and via email. Our community is a great place to ask questions and share strategies with other traders. Lifetime members receive priority support.

### 10. Q: How do I cancel my Monthly or Yearly subscription?
*A:* You can cancel your subscription at any time with a single click from the customer portal link you receive after purchase. There are no hidden fees or complicated procedures. You will retain access for the remainder of your paid billing period.`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
        ]
      ]
    };

    await ctx.reply(faqMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    logger.error('Error in direct FAQ command:', error);
    await ctx.reply('Error loading FAQ. Please try again.');
  }
});

// // Add handler for FAQ callback action
// bot.action('faq', async (ctx) => {
//   logger.info('FAQ callback action received');
//   try {
//     await ctx.answerCbQuery();
    
//     const faqMessage = `❓ <b>Frequently Asked Questions</b>\n\nSelect a category to view related FAQs:\n\n<b>General Questions</b>\n• Platform overview\n• Getting started\n• Account management\n\n<b>Payment & Billing</b>\n• Subscription plans\n• Payment methods\n• Refund policy\n\n<b>Technical Support</b>\n• Bot usage\n• Troubleshooting\n• Security\n\n<b>Trading Signals</b>\n• Signal types\n• Performance metrics\n• Risk management\n\n<b>Subscription Management</b>\n• Plan upgrades\n• Renewal process\n• Cancellation policy`;

//     const keyboard = {
//       inline_keyboard: [
//         [
//           { text: '📋 General Questions', callback_data: 'faq_general' },
//           { text: '💳 Payment & Billing', callback_data: 'faq_payment' }
//         ],
//         [
//           { text: '🔧 Technical Support', callback_data: 'faq_technical' },
//           { text: '📊 Trading Signals', callback_data: 'faq_signals' }
//         ],
//         [
//           { text: '📱 Subscription', callback_data: 'faq_subscription' }
//         ],
//         [
//           { text: '🔙 Main Menu', callback_data: 'back_to_main' }
//         ]
//       ]
//     };

//     if (ctx.callbackQuery?.message) {
//       await ctx.editMessageText(faqMessage, { 
//         reply_markup: keyboard,
//         parse_mode: 'HTML'
//       });
//     } else {
//       await ctx.reply(faqMessage, { 
//         reply_markup: keyboard,
//         parse_mode: 'HTML'
//       });
//     }
//   } catch (error) {
//     logger.error('Error in FAQ callback action:', error);
//     await ctx.reply('Error loading FAQ. Please try again.');
//   }
// });

// Handle /affiliate command
bot.command('affiliate', async (ctx) => {
  logger.info('Affiliate command received', { 
    userId: ctx.from.id,
    username: ctx.from.username
  });

  try {
    if (!ctx.from) {
      logger.error('No user context in affiliate command');
      return;
    }

    // Initialize or get user
    let user = await User.findOne({ userId: ctx.from.id });
    
    if (!user) {
      logger.info('User not found, creating new user');
      // Create new user if doesn't exist
      user = await User.create({
        userId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        affiliateStats: {
          totalEarnings: 0,
          pendingEarnings: 0,
          totalAffiliates: 0,
          successfulAffiliates: 0
        }
      });
    }

    logger.info('User lookup/creation result:', { 
      userId: ctx.from.id,
      hasAffiliateCode: user?.affiliateCode ? 'yes' : 'no'
    });

    if (!user.affiliateCode) {
      logger.info('Generating new affiliate code for user');
      // The code will be generated by the pre-save hook
      await user.save();
    }

    // Get pending rewards
    const pendingRewards = await AffiliateReward.find({
      userId: ctx.from.id,
      status: 'pending'
    });

    const totalPending = pendingRewards.reduce((sum: number, reward: { amount: number }) => sum + reward.amount, 0);

    const affiliateMessage = `🎯 Your Affiliate Program

Your Affiliate Code: <code>${user.affiliateCode}</code>

Share this link to invite others:
https://t.me/${ctx.botInfo.username}?start=${user.affiliateCode}

📊 Your Affiliate Stats:
• Total Earnings: ${user.affiliateStats?.totalEarnings || 0} SOL
• Pending Earnings: ${totalPending} SOL
• Total Affiliates: ${user.affiliateStats?.totalAffiliates || 0}
• Successful Affiliates: ${user.affiliateStats?.successfulAffiliates || 0}

💰 You earn 10% of every successful purchase made through your affiliate!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💳 Set Wallet Address', callback_data: 'set_wallet' },
          { text: '💰 Redeem Rewards', callback_data: 'redeem_rewards' }
        ],
        [
          { text: '📊 View Rewards', callback_data: 'view_rewards' }
        ],
        [
          { text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };

    logger.info('Sending affiliate message', { 
      userId: ctx.from.id,
      hasKeyboard: true
    });

    await ctx.reply(affiliateMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    logger.info('Affiliate message sent successfully', { userId: ctx.from.id });
  } catch (error) {
    logger.error('Error in affiliate command:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id
    });
    await ctx.reply('Sorry, there was an error. Please try again or use /start to initialize the bot.');
  }
});

// Add direct command handler for twitter
bot.command('twitter', async (ctx) => {
  logger.info('Twitter command received', { 
    userId: ctx.from.id,
    username: ctx.from.username
  });

  try {
    const twitterMessage = `🐦 <b>Follow SURGE on Twitter</b>\n\nStay updated with the latest news, updates, and trading insights!\n\n📱 <a href="https://x.com/TheSurgeCoin">@SURGE_AI</a>\n\nJoin our community and never miss an update! 🚀`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🐦 Follow on Twitter', url: 'https://x.com/TheSurgeCoin' }
        ],
        [
          { text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };

    await ctx.reply(twitterMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    logger.info('Twitter message sent successfully', { userId: ctx.from.id });
  } catch (error) {
    logger.error('Error in twitter command:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id
    });
    await ctx.reply('Sorry, there was an error. Please try again.');
  }
});

// Debug command to list all registered commands (admin only)
bot.command('debug', async (ctx) => {
  try {
    // Check if user is admin
    if (ctx.from.id.toString() !== ENV.ADMIN_CHAT_ID) {
      await ctx.reply('🔒 This command is only available to administrators.');
      return;
    }

    const commands = await ctx.telegram.getMyCommands();
    const commandList = commands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');
    
    const debugInfo = `🔧 **SURGE Bot Debug Information**

**Environment:** ${ENV.NODE_ENV}
**Bot Status:** Running
**Database:** ${ENV.MONGODB_URI ? 'Connected' : 'Not configured'}
**Solana RPC:** ${ENV.QUICKNODE_RPC_URL ? 'Connected' : 'Not configured'}

**Registered Commands:**
${commandList}

**Configuration:**
• Solana Wallet: ${ENV.SOLANA_WALLET_ADDRESS ? 'Set' : 'Not set'}
• CoinGecko API: ${ENV.COINGECKO_API_KEY ? 'Set' : 'Not set'}
• News API: ${ENV.NEWS_API_KEY ? 'Set' : 'Not set'}`;

    await ctx.reply(debugInfo, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in debug command:', error);
    await ctx.reply('Error fetching debug information');
  }
});

// Start bot
async function startBot() {
  try {
    logger.info('🚀 Starting SURGE Bot...');
    logger.info('Environment validation completed successfully');
    
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('Database connected successfully');
    
    // Register commands with Telegram
    logger.info('Registering bot commands...');
    try {
      await bot.telegram.setMyCommands(BOT_COMMANDS);
      logger.info('Bot commands registered successfully:', BOT_COMMANDS.map(cmd => `/${cmd.command}`).join(', '));
      
      // Verify command registration
      const registeredCommands = await bot.telegram.getMyCommands();
      logger.info('Registered commands verification:', {
        expected: BOT_COMMANDS.length,
        actual: registeredCommands.length,
        commands: registeredCommands.map(cmd => `/${cmd.command}`).join(', ')
      });
    } catch (error) {
      logger.error('Failed to register bot commands:', error);
      // Continue execution even if command registration fails
    }
    
    // Setup session middleware
    logger.info('Setting up session middleware...');
    bot.use(session());
    logger.info('Session middleware setup complete');
    
    // Setup custom middleware
    logger.info('Setting up custom middleware...');
    setupMiddleware(bot);
    logger.info('Custom middleware setup complete');
    
    // Setup commands
    logger.info('About to set up all bot commands...');
    const commandSetupFunctions = [
      { name: 'Start Command', setup: setupStartCommand },
      { name: 'Subscription Command', setup: setupSubscriptionCommand },
      { name: 'Plan Commands', setup: setupPlanCommands },
      { name: 'Payment Commands', setup: setupPaymentCommands },
      { name: 'Help Command', setup: setupHelpCommand },
      { name: 'Admin Commands', setup: setupAdminCommands },
      { name: 'Affiliate Commands', setup: setupAffiliateCommands },
      { name: 'SURGE Commands', setup: setupSurgeCommands },
      { name: 'FAQ Command', setup: setupFaqCommand }
    ];
    
    logger.info('Starting command setup loop...');
    // Setup each command and wait for completion
    for (const { name, setup } of commandSetupFunctions) {
      try {
        logger.info(`About to set up ${name}...`);
        await setup(bot);
        logger.info(`✅ Successfully set up ${name}`);
        
        // Verify command registration for subscription command
        if (name === 'Subscription Command') {
          const commands = await bot.telegram.getMyCommands();
          const subscriptionCommand = commands.find(cmd => cmd.command === 'subscription');
          logger.info('Subscription command verification:', {
            exists: !!subscriptionCommand,
            description: subscriptionCommand?.description
          });
        }
      } catch (error) {
        logger.error(`❌ Failed to set up ${name}:`, error);
        // Continue with other commands even if one fails
      }
    }
    logger.info('Bot commands setup completed');
    
    // Add error handler for bot
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      ctx.reply('An error occurred. Please try again later.').catch(logger.error);
    });
    
    // Start bot
    logger.info('Launching bot...');
    await bot.launch();
    logger.info('✅ SURGE Bot started successfully');
    logger.info(`🤖 Bot is running in ${ENV.NODE_ENV} mode`);
    
    // Log important configuration
    if (!isProduction()) {
      logger.info('Configuration details:', {
        adminChatId: ENV.ADMIN_CHAT_ID,
        channelUsername: ENV.CHANNEL_USERNAME,
        solanaWallet: ENV.SOLANA_WALLET_ADDRESS ? ENV.SOLANA_WALLET_ADDRESS.substring(0, 10) + '...' : 'Not set',
        supportEmail: ENV.SUPPORT_EMAIL
      });
    }
    
    // Enable graceful stop
    const stopSignals = ['SIGINT', 'SIGTERM'];
    stopSignals.forEach(signal => {
      process.once(signal, () => {
        logger.info(`Received ${signal}, stopping SURGE Bot...`);
        bot.stop(signal);
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start SURGE Bot:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
logger.info('About to start bot...');
startBot(); 