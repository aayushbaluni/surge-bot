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

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(faqMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(faqMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
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