import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { User } from '../database';
import { InlineKeyboardMarkup } from 'telegraf/types';
import { setupPlanCommands } from './plans';

export async function setupSubscriptionCommand(bot: Telegraf<Context>) {
  logger.info('=== Starting setupSubscriptionCommand ===');
  
  try {
    // Register the command handler
    bot.command('subscription', async (ctx) => {
      logger.info('Subscription command received', { 
        userId: ctx.from?.id,
        username: ctx.from?.username,
        session: ctx.session
      });

      try {
        if (!ctx.from) {
          logger.error('No user context in subscription command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        // Check if user exists in database
        let user = await User.findOne({ userId: ctx.from.id });
        logger.info('User lookup result:', { 
          userId: ctx.from.id, 
          exists: !!user,
          userData: user ? {
            subscription: user.subscription,
            tvUsername: user.tvUsername
          } : null
        });

        if (!user) {
          logger.info('Creating new user for subscription command', { userId: ctx.from.id });
          user = new User({
            userId: ctx.from.id,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            subscription: {
              isActive: false,
              plan: null,
              startDate: null,
              endDate: null
            }
          });
          await user.save();
          logger.info('New user created successfully', { 
            userId: ctx.from.id,
            userData: {
              subscription: user.subscription,
              tvUsername: user.tvUsername
            }
          });
        }

        // Update session step
        ctx.session.step = 'subscription';
        logger.info('Updated session step', { 
          userId: ctx.from.id,
          step: ctx.session.step
        });

        await handleSubscriptionCommand(ctx, user);
      } catch (error) {
        logger.error('Error in subscription command handler:', error);
        try {
          await ctx.reply('Error processing subscription command. Please try again later.');
        } catch (replyError) {
          logger.error('Failed to send error message:', replyError);
        }
      }
    });

    // Handle callback queries
    bot.action('back_to_subscription', async (ctx) => {
      logger.info('Back to subscription action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        const user = await User.findOne({ userId: ctx.from?.id });
        if (!user) {
          logger.error('User not found in back_to_subscription', { userId: ctx.from?.id });
          await ctx.reply('Error: User not found. Please try /start first.');
          return;
        }
        await handleSubscriptionCommand(ctx, user);
      } catch (error) {
        logger.error('Error in back_to_subscription action:', error);
        await ctx.reply('Error loading subscription. Please try again.');
      }
    });

    bot.action('renew_subscription', async (ctx) => {
      logger.info('Renew subscription action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await setupPlanCommands(bot);
      } catch (error) {
        logger.error('Error in renew_subscription action:', error);
        await ctx.reply('Error loading renewal options. Please try again.');
      }
    });

    bot.action('settings', async (ctx) => {
      logger.info('Settings action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await ctx.reply('Please update your settings:', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Update TradingView Username', callback_data: 'update_tv_username' }
              ],
              [
                { text: '🔙 Back', callback_data: 'back_to_subscription' }
              ]
            ]
          }
        });
      } catch (error) {
        logger.error('Error in settings action:', error);
        await ctx.reply('Error loading settings. Please try again.');
      }
    });

    bot.action('view_dashboard', async (ctx) => {
      logger.info('View dashboard action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await ctx.reply('🚧 Dashboard is currently under maintenance. Please check back later.');
        return;
        
        /* Commented out dashboard functionality
        const user = await User.findOne({ userId: ctx.from?.id });
        
        if (!user?.subscription?.isActive) {
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

        await ctx.reply(dashboardMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
        */
      } catch (error) {
        logger.error('Error in view_dashboard action:', error);
        await ctx.reply('Error loading dashboard. Please try again.');
      }
    });

    bot.action('view_signals', async (ctx) => {
      logger.info('View signals action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await ctx.reply('📈 Recent signals will be displayed here.');
      } catch (error) {
        logger.error('Error in view_signals action:', error);
        await ctx.reply('Error loading signals. Please try again.');
      }
    });

    bot.action('back_to_main', async (ctx) => {
      logger.info('Back to main action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await ctx.reply('Main menu:', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 View Plans', callback_data: 'view_plans' },
                { text: '📊 Dashboard', callback_data: 'view_dashboard' }
              ],
              [
                { text: '⚙️ Settings', callback_data: 'settings' },
                { text: '❓ Help', callback_data: 'help' }
              ]
            ]
          }
        });
      } catch (error) {
        logger.error('Error in back_to_main action:', error);
        await ctx.reply('Error loading main menu. Please try again.');
      }
    });

    logger.info('Subscription command and callbacks setup completed');
  } catch (error) {
    logger.error('Error in setupSubscriptionCommand:', error);
    throw error;
  }
}

async function handleSubscriptionCommand(ctx: Context, user: any) {
  logger.info('=== Subscription command handler started ===', { 
    userId: ctx.from?.id,
    username: ctx.from?.username,
    userData: {
      subscription: user.subscription,
      tvUsername: user.tvUsername
    }
  });
  
  try {
    if (!user.subscription?.isActive) {
      logger.info('User has no active subscription', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      await handleNoSubscription(ctx);
      return;
    }

    await handleActiveSubscription(ctx, user);
  } catch (error) {
    logger.error('Error in handleSubscriptionCommand:', error);
    await ctx.reply('Error processing subscription. Please try again.');
  }
}

async function handleNoSubscription(ctx: Context) {
  const message = `📊 **Your Subscription Status**

You don't have an active subscription.

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
}

async function handleActiveSubscription(ctx: Context, user: any) {
  const escapeMarkdown = (text: string) => text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  
  const username = escapeMarkdown(user.username || 'N/A');
  const startDate = escapeMarkdown(user.subscription.startDate.toLocaleDateString());
  const endDate = escapeMarkdown(user.subscription.endDate.toLocaleDateString());
  const daysRemaining = Math.ceil((user.subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const planName = escapeMarkdown(user.subscription.plan);

  // Check if subscription has expired
  if (daysRemaining <= 0) {
    // Update user's subscription status in database
    await User.findOneAndUpdate(
      { userId: user.userId },
      { 
        'subscription.isActive': false,
        'subscription.plan': null,
        'subscription.startDate': null,
        'subscription.endDate': null
      }
    );

    // Show expired subscription message
    const expiredMessage = `❌ **Subscription Expired**

Your ${planName} subscription has expired on ${endDate}.

Choose an option below to renew your subscription:`;

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

    await ctx.reply(expiredMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    return;
  }

  const message = `📊 **Subscription Details**

👤 User: @${username}
📅 Start Date: ${startDate}
📅 End Date: ${endDate}
⏳ Days Remaining: ${daysRemaining}
📋 Plan: ${planName}

Choose an option below:`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔄 Renew', callback_data: 'renew_subscription' },
        { text: '⚙️ Settings', callback_data: 'settings' }
      ],
      [
        { text: '📊 Dashboard', callback_data: 'view_dashboard' },
        { text: '📈 Signals', callback_data: 'view_signals' }
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
} 