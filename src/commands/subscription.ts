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

    bot.action('cancel_payment', async (ctx) => {
      logger.info('Cancel payment action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        const user = await User.findOne({ userId: ctx.from?.id });
        if (!user) {
          logger.error('User not found in cancel_payment', { userId: ctx.from?.id });
          await ctx.reply('Error: User not found. Please try /start first.');
          return;
        }
        await handleSubscriptionCommand(ctx, user);
      } catch (error) {
        logger.error('Error in cancel_payment action:', error);
        await ctx.reply('Error cancelling payment. Please try again.');
      }
    });

    bot.action('back_to_plans', async (ctx) => {
      logger.info('Back to plans action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        const user = await User.findOne({ userId: ctx.from?.id });
        if (!user) {
          logger.error('User not found in back_to_plans', { userId: ctx.from?.id });
          await ctx.reply('Error: User not found. Please try /start first.');
          return;
        }
        await handleSubscriptionCommand(ctx, user);
      } catch (error) {
        logger.error('Error in back_to_plans action:', error);
        await ctx.reply('Error loading plans. Please try again.');
      }
    });

    bot.action('affiliate_program', async (ctx) => {
      logger.info('Affiliate program action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        await ctx.reply('Please use /affiliate command to view the affiliate program details and track your earnings.');
      } catch (error) {
        logger.error('Error in affiliate_program action:', error);
        await ctx.reply('Error processing affiliate program request. Please try again.');
      }
    });

    bot.action('faq', async (ctx) => {
      logger.info('FAQ action triggered', { 
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      try {
        await ctx.answerCbQuery();
        const faqMessage = `❓ <b>Frequently Asked Questions</b>

1. <b>How do I subscribe?</b>
   • Choose a plan
   • Send SOL to the provided wallet
   • Submit your transaction ID
   • Provide your TradingView username

2. <b>How do I renew?</b>
   • Use the Renew button in your subscription details
   • Follow the same payment process

3. <b>What happens after payment?</b>
   • Your payment will be verified within 1 hour
   • You'll receive a confirmation message
   • Your subscription will be activated

4. <b>Need more help?</b>
   Contact our support team for assistance.`;

        await ctx.editMessageText(faqMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 Back to Subscription', callback_data: 'back_to_subscription' }
              ]
            ]
          }
        });
      } catch (error) {
        logger.error('Error in FAQ action:', error);
        await ctx.reply('Error loading FAQ. Please try again.');
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
        { text: '❓ FAQ', callback_data: 'faq' }
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
  
  // Calculate time remaining
  const now = new Date();
  const end = new Date(user.subscription.endDate);
  const timeRemaining = end.getTime() - now.getTime();
  
  // Format time remaining based on plan type
  let timeRemainingText = '';
  if (user.subscription.plan === 'Trial Plan') {
    logger.warn('Trial plan detected', { 
      userId: ctx.from?.id,
      username: ctx.from?.username,
      plan: user.subscription.plan
    });
    // For trial plans, always show hours, minutes, seconds
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // If more than 24 hours, show days instead
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      timeRemainingText = `${days} days`;
    } else {
      timeRemainingText = `${hours}h ${minutes}m ${seconds}s`;
    }
  } else {
    // For other plans, show days
    const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    timeRemainingText = `${daysRemaining} days`;
  }

  const planName = escapeMarkdown(user.subscription.plan);

  // Check if subscription has expired
  if (timeRemaining <= 0) {
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
          { text: '❓ FAQ', callback_data: 'faq' }
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
⏳ Time Remaining: ${timeRemainingText}
📋 Plan: ${planName}

Choose an option below:`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔄 Renew', callback_data: 'renew_subscription' }
      ],
      [
        { text: '❓ FAQ', callback_data: 'faq' }
      ]
    ]
  };

  await ctx.reply(message, { 
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
} 