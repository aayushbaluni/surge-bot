import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { InlineKeyboardMarkup } from 'telegraf/types';

export async function setupFaqCommand(bot: Telegraf<Context>) {
  try {
    logger.info('Setting up FAQ command...');

    // Register FAQ command handler
    bot.command('faq', async (ctx) => {
      logger.info('FAQ command received');
      try {
        if (!ctx.from) {
          logger.error('No user context in FAQ command');
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        logger.info(`Processing FAQ command for user ${ctx.from.id}`);
        await showFaqMain(ctx);
      } catch (error) {
        logger.error('Error in FAQ command:', error);
        await ctx.reply('Error loading FAQ. Please try again.');
      }
    });

    // Register FAQ action handlers
    bot.action('faq_general', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await showGeneralFaq(ctx);
      } catch (error) {
        logger.error('Error in faq_general action:', error);
        await ctx.reply('Error loading general FAQ.');
      }
    });

    bot.action('faq_payment', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await showPaymentFaq(ctx);
      } catch (error) {
        logger.error('Error in faq_payment action:', error);
        await ctx.reply('Error loading payment FAQ.');
      }
    });

    bot.action('faq_technical', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await showTechnicalFaq(ctx);
      } catch (error) {
        logger.error('Error in faq_technical action:', error);
        await ctx.reply('Error loading technical FAQ.');
      }
    });

    bot.action('faq_signals', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await showSignalsFaq(ctx);
      } catch (error) {
        logger.error('Error in faq_signals action:', error);
        await ctx.reply('Error loading signals FAQ.');
      }
    });

    bot.action('faq_subscription', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await showSubscriptionFaq(ctx);
      } catch (error) {
        logger.error('Error in faq_subscription action:', error);
        await ctx.reply('Error loading subscription FAQ.');
      }
    });

    logger.info('Successfully set up FAQ command and handlers');
  } catch (error) {
    logger.error('Error setting up FAQ command:', error);
    throw error;
  }
}

async function showFaqMain(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `❓ <b>Frequently Asked Questions</b>\n\nSelect a category to view related FAQs:\n\n<b>General Questions</b>\n• Platform overview\n• Getting started\n• Account management\n\n<b>Payment & Billing</b>\n• Subscription plans\n• Payment methods\n• Refund policy\n\n<b>Technical Support</b>\n• Bot usage\n• Troubleshooting\n• Security\n\n<b>Trading Signals</b>\n• Signal types\n• Performance metrics\n• Risk management\n\n<b>Subscription Management</b>\n• Plan upgrades\n• Renewal process\n• Cancellation policy`;

  const keyboard: InlineKeyboardMarkup = {
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
}

async function showGeneralFaq(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `📋 <b>General Questions</b>\n\n<b>What is SURGE?</b>\nSURGE is an AI-powered trading signals platform that provides real-time market analysis and trading opportunities.\n\n<b>How do I get started?</b>\n1. Create an account\n2. Choose a subscription plan\n3. Connect your TradingView account\n4. Start receiving signals\n\n<b>Is my data secure?</b>\nYes, we use industry-standard encryption and security measures to protect your data.\n\n<b>Can I use SURGE on mobile?</b>\nYes, SURGE is accessible via Telegram on both iOS and Android devices.\n\n<b>How accurate are the signals?</b>\nOur AI model maintains a 96.5% win rate with an average profit of 4.2% per trade.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to FAQ', callback_data: 'faq' }
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
}

async function showPaymentFaq(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `💳 <b>Payment & Billing</b>\n\n<b>What payment methods are accepted?</b>\nWe accept SOL, USDT, and major credit/debit cards.\n\n<b>How do I upgrade my plan?</b>\nGo to your subscription settings and select a new plan.\n\n<b>Can I get a refund?</b>\nRefunds are available within 24 hours of purchase if you have not used the service.\n\n<b>How do I view my payment history?</b>\nCheck your account dashboard for a full payment history.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to FAQ', callback_data: 'faq' }
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
}

async function showTechnicalFaq(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `🔧 <b>Technical Support</b>\n\n<b>How do I use the bot?</b>\nType /start to begin, then follow the menu prompts.\n\n<b>What if I stop receiving signals?</b>\nCheck your subscription status and Telegram notification settings.\n\n<b>Is my account secure?</b>\nYes, we use advanced security protocols to protect your account.\n\n<b>How do I report a bug?</b>\nContact support with details about the issue.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to FAQ', callback_data: 'faq' }
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
}

async function showSignalsFaq(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `📊 <b>Trading Signals</b>\n\n<b>What types of signals are provided?</b>\nWe provide buy/sell signals for major crypto pairs.\n\n<b>How often are signals updated?</b>\nSignals are updated in real-time as market conditions change.\n\n<b>How do I interpret the signals?</b>\nEach signal includes entry, take profit, stop loss, and confidence level.\n\n<b>Can I automate trading with these signals?</b>\nYes, you can use TradingView webhooks or compatible bots for automation.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to FAQ', callback_data: 'faq' }
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
}

async function showSubscriptionFaq(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply('Error: Could not identify user.');
    return;
  }

  const faqMessage = `📱 <b>Subscription Management</b>\n\n<b>How do I upgrade my plan?</b>\nGo to your subscription settings and select a new plan.\n\n<b>How do I renew my subscription?</b>\nYou will receive a reminder before your plan expires. Follow the prompts to renew.\n\n<b>How do I cancel my subscription?</b>\nContact support to request cancellation.\n\n<b>What happens if my subscription expires?</b>\nYou will lose access to premium features until you renew.`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to FAQ', callback_data: 'faq' }
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
} 