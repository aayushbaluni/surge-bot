import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { 
  CHANNEL_USERNAME, 
  SUPPORT_EMAIL, 
  WEBSITE_URL, 
  TELEGRAM_CHANNEL,
  SURGE_ANNOUNCEMENTS_CHANNEL 
} from '../config/env';

export function setupHelpCommand(bot: Telegraf<Context>) {
  // Handle help button
  bot.action('help', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const helpMessage = `📚 **Help & Support**

Here's how to use our bot:

1️⃣ Subscription Commands:
• /start - Begin subscription process
• /plans - View available plans
• /subscription - Check your subscription status

2️⃣ Account Management:
• /renew - Renew your subscription

3️⃣ Help:
• /help - This help menu
• /faq - Frequently asked questions

Need more help? Visit our website!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🌐 Website', url: 'https://surgetrade.io' }
          ],
          [{ text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }]
        ]
      };

      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(helpMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await ctx.reply(helpMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      logger.error('Error in help action:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  // Handle help command
  bot.command('help', async (ctx) => {
    try {
      const helpMessage = `🆘 <b>SURGE Bot Help & Support</b>\n\n<b>📚 Available Commands:</b>\n• /start - Welcome & sign up\n• /menu - Main menu navigation\n• /subscription - Manage subscription\n• /help - This help menu\n• /faq - Frequently asked questions\n\n<b>🔗 Quick Links:</b>\n• Website: <a href='https://surgetrade.io'>surgetrade.io</a>\n\n<b>📞 Need Help?</b>\nVisit our website for assistance with:\n• Payment issues\n• Account access\n• Technical questions\n• Subscription inquiries`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🌐 Website', url: 'https://surgetrade.io' }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(helpMessage, { 
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } catch (error) {
      logger.error('Error in help command:', error);
      await ctx.reply('Error loading help information. Please try again.');
    }
  });

  // Handle back to main menu
  bot.action('back_to_main', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const welcomeMessage = `👋 Welcome to SURGE Bot!

I'm your personal assistant for managing your SURGE subscription. Here's what I can help you with:

📊 View subscription plans
💳 Process payments
🎯 Referral program
❓ Get help and support

Use the buttons below to get started!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📋 Get Access Now', callback_data: 'view_plans' },
            { text: '💳 My Subscription', callback_data: 'my_subscription' }
          ],
          [
            { text: '🎯 Referral Program', callback_data: 'referral_program' },
            { text: '❓ Help', callback_data: 'help' }
          ]
        ]
      };

      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(welcomeMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await ctx.reply(welcomeMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      logger.error('Error in back to main menu action:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  bot.command('commands', async (ctx) => {
    try {
      const commandsMessage = `📋 **Complete Command List**

**🚀 Getting Started:**
• /start - Welcome & registration
• /menu - Main navigation menu
• /plans - View subscription plans

**📊 Account Management:**
• /subscription - Manage subscription
• /renew - Renew current plan

**⚙️ Features:**
• /invite - Share referral link
• /affiliate - View earnings

**ℹ️ Information:**
• /help - This help menu
• /faq - Common questions

**📞 Help:**
• Website: ${WEBSITE_URL}

Use any command by typing it with a forward slash (/).`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🌐 Website', url: WEBSITE_URL }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(commandsMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in commands help:', error);
      await ctx.reply('Error loading commands list. Please try again.');
    }
  });
} 