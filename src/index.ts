import { Telegraf, session } from 'telegraf';
import { setupStartCommand } from './commands/start';
import { setupPlanCommands } from './commands/plans';
import { setupPaymentCommands } from './commands/payment';
import { setupHelpCommand } from './commands/help';
import { setupAdminCommands } from './commands/admin';
import { setupReferralCommands } from './commands/referral';
import { setupSurgeCommands } from './commands/surge';
import { setupFaqCommand } from './commands/faq';
import { setupMiddleware } from './middleware';
import { logger } from './utils/logger';
import { connectDatabase } from './database';
import { Context } from './types';
import { ENV, BOT_TOKEN, isProduction } from './config/env';
import { User, ReferralReward } from './database';

logger.info('Starting to import setupSubscriptionCommand...');
import { setupSubscriptionCommand } from './commands/subscription';
logger.info('Successfully imported setupSubscriptionCommand');

// Define bot commands
const BOT_COMMANDS = [
  { command: 'start', description: 'Start the bot and view welcome message' },
  { command: 'menu', description: 'Show main menu' },
  { command: 'subscription', description: 'Manage your subscription' },
  { command: 'renew', description: 'Renew your current plan' },
  { command: 'settings', description: 'Update preferences and TradingView username' },
  { command: 'faq', description: 'Frequently asked questions' },
  { command: 'tokeninfo', description: 'View SURGE token information' },
  { command: 'joinchannel', description: 'Join official announcements channel' },
  { command: 'affiliate', description: 'View referral program and earnings' },
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

    const faqMessage = `❓ <b>Frequently Asked Questions</b>\n\nSelect a category to view related FAQs:\n\n<b>General Questions</b>\n• Platform overview\n• Getting started\n• Account management\n\n<b>Payment & Billing</b>\n• Subscription plans\n• Payment methods\n• Refund policy\n\n<b>Technical Support</b>\n• Bot usage\n• Troubleshooting\n• Security\n\n<b>Trading Signals</b>\n• Signal types\n• Performance metrics\n• Risk management\n\n<b>Subscription Management</b>\n• Plan upgrades\n• Renewal process\n• Cancellation policy`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 General Questions', callback_data: 'faq_general' },
          { text: '💳 Payment & Billing', callback_data: 'faq_payment' }
        ],
        [
          { text: '🔧 Technical Support', callback_data: 'faq_technical' },
          { text: '📊 Trading Signals', callback_data: 'faq_signals' }
        ],
        [
          { text: '📱 Subscription', callback_data: 'faq_subscription' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };

    await ctx.reply(faqMessage, { 
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    logger.error('Error in direct FAQ command:', error);
    await ctx.reply('Error loading FAQ. Please try again.');
  }
});

// Add handler for FAQ callback action
bot.action('faq', async (ctx) => {
  logger.info('FAQ callback action received');
  try {
    await ctx.answerCbQuery();
    
    const faqMessage = `❓ <b>Frequently Asked Questions</b>\n\nSelect a category to view related FAQs:\n\n<b>General Questions</b>\n• Platform overview\n• Getting started\n• Account management\n\n<b>Payment & Billing</b>\n• Subscription plans\n• Payment methods\n• Refund policy\n\n<b>Technical Support</b>\n• Bot usage\n• Troubleshooting\n• Security\n\n<b>Trading Signals</b>\n• Signal types\n• Performance metrics\n• Risk management\n\n<b>Subscription Management</b>\n• Plan upgrades\n• Renewal process\n• Cancellation policy`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 General Questions', callback_data: 'faq_general' },
          { text: '💳 Payment & Billing', callback_data: 'faq_payment' }
        ],
        [
          { text: '🔧 Technical Support', callback_data: 'faq_technical' },
          { text: '📊 Trading Signals', callback_data: 'faq_signals' }
        ],
        [
          { text: '📱 Subscription', callback_data: 'faq_subscription' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };

    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(faqMessage, { 
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } else {
      await ctx.reply(faqMessage, { 
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    logger.error('Error in FAQ callback action:', error);
    await ctx.reply('Error loading FAQ. Please try again.');
  }
});

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
        referralStats: {
          totalEarnings: 0,
          pendingEarnings: 0,
          totalReferrals: 0,
          successfulReferrals: 0
        }
      });
    }

    logger.info('User lookup/creation result:', { 
      userId: ctx.from.id,
      hasReferralCode: user?.referralCode ? 'yes' : 'no'
    });

    if (!user.referralCode) {
      logger.info('Generating new referral code for user');
      // Generate a new referral code if none exists
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      user.referralCode = code;
      await user.save();
    }

    // Get pending rewards
    const pendingRewards = await ReferralReward.find({
      userId: ctx.from.id,
      status: 'pending'
    });

    const totalPending = pendingRewards.reduce((sum: number, reward: { amount: number }) => sum + reward.amount, 0);

    const affiliateMessage = `🎯 Your Affiliate Program

Your Referral Code: <code>${user.referralCode}</code>

Share this link to invite others:
https://t.me/${ctx.botInfo.username}?start=${user.referralCode}

📊 Your Affiliate Stats:
• Total Earnings: ${user.referralStats?.totalEarnings || 0} SOL
• Pending Earnings: ${totalPending} SOL
• Total Referrals: ${user.referralStats?.totalReferrals || 0}
• Successful Referrals: ${user.referralStats?.successfulReferrals || 0}

💰 You earn 10% of every successful purchase made through your referral!`;

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
    const twitterMessage = `🐦 <b>Follow SURGE on Twitter</b>\n\nStay updated with the latest news, updates, and trading insights!\n\n📱 <a href="https://twitter.com/SURGE_AI">@SURGE_AI</a>\n\nJoin our community and never miss an update! 🚀`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🐦 Follow on Twitter', url: 'https://twitter.com/SURGE_AI' }
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
      { name: 'Referral Commands', setup: setupReferralCommands },
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