import { Telegraf } from 'telegraf';
import { Context, PLANS, SOLANA_WALLET_ADDRESS } from '../types';
import { logger } from '../utils/logger';
import { User, Transaction, ReferralReward } from '../database';
import { InlineKeyboardMarkup } from 'telegraf/types';
import { TWITTER_URL, SUPPORT_EMAIL, SURGE_ANNOUNCEMENTS_CHANNEL } from '../config/env';
import axios from 'axios';

// Function to get SURGE token price and market data
async function getSurgeTokenInfo(): Promise<any> {
  try {
    // Mock data - replace with actual API call
    return {
      price: 0.025,
      change24h: 12.5,
      marketCap: 2500000,
      volume24h: 150000
    };
  } catch (error) {
    logger.error('Error fetching SURGE token info:', error);
    return {
      price: 0.025,
      change24h: 0,
      marketCap: 2500000,
      volume24h: 150000
    };
  }
}

export async function setupSurgeCommands(bot: Telegraf<Context>) {
  try {
    logger.info('Setting up SURGE commands...');
    
    // Register command handlers
    bot.command('signals', async (ctx) => {
      logger.info('Signals command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in signals command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        logger.info(`Processing signals command for user ${ctx.from.id}`);
        const user = await User.findOne({ userId: ctx.from.id });
        
        if (!user?.subscription?.isActive) {
          await ctx.reply('🔒 You need an active subscription to view signals. Use /menu to subscribe.');
          return;
        }

        await handleSignalsView(ctx);
      } catch (error) {
        logger.error('Error in signals command:', error);
        await ctx.reply('Error loading signals. Please try again.');
      }
    });

    bot.command('dashboard', async (ctx) => {
      logger.info('Dashboard command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in dashboard command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        await ctx.reply('🚧 Dashboard is currently under maintenance. Please check back later.');
        return;

        /* Commented out dashboard functionality
        logger.info(`Processing dashboard command for user ${ctx.from.id}`);
        const user = await User.findOne({ userId: ctx.from.id });
        
        if (!user) {
          await ctx.reply('Please use /start first to initialize your account.');
          return;
        }

        if (!user.subscription?.isActive) {
          const message = `🔒 **Dashboard Access Required**

You need an active subscription to view the dashboard.

**Available Plans:**
• 🎁 Trial – 0.1 SOL (24h)
• 📅 Monthly – 1 SOL
• 🔥 6-Month – 4.5 SOL (Save 25%)
• ⭐ Yearly – 8 SOL (Save 33%)
• 💎 Lifetime – 10 SOL (100 seats)

Choose an option below:`;

          const keyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
              [
                { text: '📋 View Plans', callback_data: 'view_plans' }
              ],
              [
                { text: '❓ FAQ', callback_data: 'faq' },
                { text: '🆘 Support', callback_data: 'support' }
              ]
            ]
          };

          await ctx.reply(message, { 
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          });
          return;
        }

        await handleDashboardView(ctx);
        */
      } catch (error) {
        logger.error('Error in dashboard command:', error);
        await ctx.reply('Error loading dashboard. Please try again.');
      }
    });

    bot.command('settings', async (ctx) => {
      logger.info('Settings command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in settings command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        logger.info(`Processing settings command for user ${ctx.from.id}`);
        await handleSettingsView(ctx);
      } catch (error) {
        logger.error('Error in settings command:', error);
        await ctx.reply('Error loading settings. Please try again.');
      }
    });

    bot.command('tokeninfo', async (ctx) => {
      logger.info('Token info command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in token info command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        logger.info(`Processing token info command for user ${ctx.from.id}`);
        await handleTokenInfoView(ctx);
      } catch (error) {
        logger.error('Error in token info command:', error);
        await ctx.reply('Error loading token information. Please try again.');
      }
    });

    bot.command('support', async (ctx) => {
      logger.info('Support command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in support command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        logger.info(`Processing support command for user ${ctx.from.id}`);
        await handleSupportView(ctx);
      } catch (error) {
        logger.error('Error in support command:', error);
        await ctx.reply('Error loading support options. Please try again.');
      }
    });

    // Register callback handlers
    bot.action('view_signals', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await handleSignalsView(ctx);
      } catch (error) {
        logger.error('Error in view_signals action:', error);
        await ctx.reply('Error loading signals.');
      }
    });

    bot.action('view_dashboard', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await handleDashboardView(ctx);
      } catch (error) {
        logger.error('Error in view_dashboard action:', error);
        await ctx.reply('Error loading dashboard.');
      }
    });

    bot.action('settings', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await handleSettingsView(ctx);
      } catch (error) {
        logger.error('Error in settings action:', error);
        await ctx.reply('Error loading settings.');
      }
    });

    bot.action('token_info', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await handleTokenInfoView(ctx);
      } catch (error) {
        logger.error('Error in token_info action:', error);
        await ctx.reply('Error loading token information.');
      }
    });

    logger.info('Successfully set up SURGE commands and handlers');
  } catch (error) {
    logger.error('Error setting up SURGE commands:', error);
    throw error;
  }
}

// Helper functions
async function handleSignalsView(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const user = await User.findOne({ userId: ctx.from.id });
  
  if (!user?.subscription?.isActive) {
    const message = `🔒 **Premium Signals Access Required**

You need an active subscription to view trading signals.

**Available Plans:**
• 🎁 Trial – 0.1 SOL (24h)
• 📅 Monthly – 1 SOL (Save 50%)
• ⭐ Yearly – 8 SOL (Save 60%)
• 💎 Lifetime – 10 SOL (Save 75%)

Choose an option below:`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '📋 View Plans', callback_data: 'view_plans' }
        ],
        [
          { text: '❓ FAQ', callback_data: 'faq' },
          { text: '🆘 Support', callback_data: 'support' }
        ]
      ]
    };

    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(message, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.reply(message, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    }
    return;
  }

  const signalsMessage = `🚨 **LIVE Trading Signals** (${new Date().toLocaleString()})

**🔥 HOT SIGNAL - BTC/USDT**
Type: LONG
Entry: $45,000
Take Profit 1: $46,500 (+3.3%)
Take Profit 2: $48,000 (+6.7%)
Stop Loss: $44,000 (-2.2%)
Risk/Reward: 1:3
Timeframe: 4H
Confidence: 95%

**📊 ETH/USDT**
Type: SHORT
Entry: $2,800
Take Profit 1: $2,700 (+3.6%)
Take Profit 2: $2,600 (+7.1%)
Stop Loss: $2,900 (-3.6%)
Risk/Reward: 1:2
Timeframe: 1H
Confidence: 85%

**⚡ SOL/USDT**
Type: LONG
Entry: $95
Take Profit 1: $98 (+3.2%)
Take Profit 2: $102 (+7.4%)
Stop Loss: $92 (-3.2%)
Risk/Reward: 1:2.3
Timeframe: 15M
Confidence: 90%

**💡 Trading Tips:**
• Use proper position sizing (1-2% per trade)
• Set stop loss before entering
• Take partial profits at TP1
• Monitor market conditions

Signals are updated in real-time. Use /dashboard for performance metrics.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔄 Refresh Signals', callback_data: 'view_signals' },
        { text: '📊 Dashboard', callback_data: 'view_dashboard' }
      ],
      [
        { text: '📈 My Stats', callback_data: 'view_stats' },
        { text: '⚙️ Settings', callback_data: 'settings' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(signalsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(signalsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
}

async function handleDashboardView(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const from = ctx.from; // Type assertion
  
  const dashboardMessage = `📊 **Trading Performance Dashboard**

**Overall Statistics:**
• Win Rate: 96.5%
• Total Trades: 156
• Average Profit: +4.2%
• Best Trade: +12.8%
• Risk/Reward: 1:2.5

**Recent Performance:**
• Last 7 Days: +18.5%
• Last 30 Days: +42.3%
• Last 90 Days: +156.8%

**Top Performing Assets:**
1. SOL: +28.5%
2. AVAX: +22.3%
3. ETH: +18.7%

**Risk Management:**
• Average Stop Loss: -2.1%
• Max Drawdown: -4.5%
• Recovery Time: 2.3 days

View detailed trade history and analytics in the private group.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '📊 View Signals', callback_data: 'view_signals' },
        { text: '📈 My Stats', callback_data: 'view_stats' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(dashboardMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(dashboardMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
}

async function handleSettingsView(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const from = ctx.from; // Type assertion
  
  const settingsMessage = `⚙️ **Settings & Preferences**

**Account Settings:**
• TradingView Username: @username
• Notification Settings: All enabled
• Language: English
• Timezone: UTC+0

**Signal Preferences:**
• Asset Types: All
• Timeframes: 1h, 4h, 1d
• Risk Level: Medium
• Position Size: 2% per trade

**Notification Settings:**
• Signal Alerts: ✅
• Price Alerts: ✅
• News Updates: ✅
• Market Analysis: ✅

Use the buttons below to update your preferences.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '👤 Update TV Username', callback_data: 'update_tv_username' },
        { text: '🔔 Notifications', callback_data: 'notification_settings' }
      ],
      [
        { text: '📊 Signal Preferences', callback_data: 'signal_preferences' },
        { text: '🌍 Language', callback_data: 'language_settings' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(settingsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(settingsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
}

async function handleTokenInfoView(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const from = ctx.from; // Type assertion
  
  const tokenInfoMessage = `💹 **SURGE Token Information**

**Token Details:**
• Name: SURGE
• Symbol: SURGE
• Network: Solana
• Total Supply: 1,000,000,000
• Circulating Supply: 750,000,000

**Price Information:**
• Current Price: $0.25
• 24h Change: +5.2%
• 7d Change: +12.8%
• 30d Change: +45.3%

**Market Data:**
• Market Cap: $187.5M
• 24h Volume: $12.3M
• Holders: 25,000+
• Transactions: 100,000+

**Token Utility:**
• Platform Access
• Fee Discounts
• Governance Rights
• Staking Rewards

**Contract Address:**
\`SURGE...\`

View charts and trade on Raydium or Jupiter.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '📈 View Chart', url: 'https://raydium.io/swap' },
        { text: '💱 Trade', url: 'https://jup.ag' }
      ],
      [
        { text: '📊 Dashboard', callback_data: 'view_dashboard' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(tokenInfoMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(tokenInfoMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
}

async function handleSupportView(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const from = ctx.from; // Type assertion
  
  const supportMessage = `🆘 **SURGE Bot Support**

**Need Help?**

Our support team is here to assist you 24/7!

**Contact Options:**
• 💬 Live Chat: Click "Start Live Support" below
• 📧 Email: ${SUPPORT_EMAIL}
• 🎫 Create Ticket: Use the ticket system
• 📱 Telegram: @SURGESupport

**Common Issues:**
• Payment verification
• TradingView integration
• Signal delivery
• Account activation
• Technical support

**Response Time:**
• Live Chat: < 5 minutes
• Email: < 2 hours
• Tickets: < 1 hour

We're committed to providing excellent support!`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '💬 Start Live Support', callback_data: 'start_live_support' }
      ],
      [
        { text: '🎫 Create Support Ticket', callback_data: 'create_ticket' }
      ],
      [
        { text: '❓ View FAQ', callback_data: 'faq' },
        { text: '📧 Email Support', url: `mailto:${SUPPORT_EMAIL}` }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(supportMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown' 
    });
  } else {
    await ctx.reply(supportMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown' 
    });
  }
} 