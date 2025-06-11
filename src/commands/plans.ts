import { Telegraf, Markup } from 'telegraf';
import { Context, PLANS, SOLANA_WALLET_ADDRESS } from '../types';
import { logger } from '../utils/logger';
import { InlineKeyboardMarkup } from 'telegraf/types';

export function setupPlanCommands(bot: Telegraf<Context>) {
  
  // View Plans Handler
  bot.action('view_plans', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const plansMessage = `📋 Select a plan (pay in SOL). All include SURGE's exclusive AI signals and private group access.

💎 **Choose your subscription:**`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '🎁 Trial – 0.1 SOL (24h)', callback_data: 'plan_trial' }
          ],
          [
            { text: '📅 Monthly – 1 SOL (Save 50%)', callback_data: 'plan_monthly' }
          ],
          // [
          //   // { text: '🔥 6-Month – 4.5 SOL (Save 25%)', callback_data: 'plan_six_month' }
          // ],
          [
            { text: '⭐ Yearly – 8 SOL (Save 60%)', callback_data: 'plan_yearly' }
          ],
          [
            { text: '💎 Lifetime – 10 SOL (Save 75%)', callback_data: 'plan_lifetime' }
          ],
          [
            { text: '🔙 Back', callback_data: 'back_to_main' }
          ]
        ]
      };

      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(plansMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await ctx.reply(plansMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      logger.error('Error in view plans:', error);
      await ctx.reply('Error loading plans. Please try again.');
    }
  });

  // Plan Selection Handlers
  Object.keys(PLANS).forEach(planKey => {
    bot.action(`plan_${planKey}`, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const plan = PLANS[planKey];
        
        ctx.session.selectedPlan = {
          type: plan.type,
          price: plan.price,
          duration: plan.duration,
          name: plan.name
        };

        const planDetailsMessage = `💎 **${plan.name}** – ${plan.price} SOL

${plan.badge ? `${plan.badge}\n` : ''}${plan.discountText ? `💰 ${plan.discountText}\n` : ''}
**Features included:**
${plan.features.map(feature => `• ${feature}`).join('\n')}

Press **Proceed to Payment** or **Back**.`;

        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '💳 Proceed to Payment', callback_data: 'proceed_to_payment' }
            ],
            [
              { text: '🔙 Back', callback_data: 'view_plans' }
            ]
          ]
        };

        await ctx.editMessageText(planDetailsMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        logger.error(`Error in plan selection ${planKey}:`, error);
        await ctx.reply('Error processing plan selection. Please try again.');
      }
    });
  });

  // Proceed to Payment Handler
  bot.action('proceed_to_payment', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      if (!ctx.session.selectedPlan) {
        await ctx.reply('No plan selected. Please choose a plan first.');
        return;
      }

      const paymentMessage = `🚀 Send **${ctx.session.selectedPlan.price} SOL** to:
\`${SOLANA_WALLET_ADDRESS}\`

When done, tap **I've Paid**.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "✅ I've Paid", callback_data: 'payment_done' }
          ],
          [
            { text: '🔙 Cancel', callback_data: 'view_plans' }
          ]
        ]
      };

      ctx.session.step = 'payment';
      ctx.session.paymentDetails = {
        amount: ctx.session.selectedPlan.price,
        walletAddress: SOLANA_WALLET_ADDRESS
      };
      
      await ctx.editMessageText(paymentMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in proceed to payment:', error);
      await ctx.reply('Error processing payment request. Please try again.');
    }
  });

  // Payment Done Handler
  bot.action('payment_done', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const txidMessage = `📥 Please reply with your **Solana TXID** .

Format: Just paste the transaction ID from your wallet.`;

      ctx.session.step = 'awaiting_txid';
      
      await ctx.editMessageText(txidMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error in payment done:', error);
      await ctx.reply('Error processing payment confirmation. Please try again.');
    }
  });

  // Handle back to plans
  bot.action('back_to_plans', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const plansMessage = `📋 Select a plan (pay in SOL). All include SURGE's exclusive AI signals and private group access.

💎 **Choose your subscription:**`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '🎁 Trial – 0.1 SOL (24h)', callback_data: 'plan_trial' }
          ],
          [
            { text: '📅 Monthly – 1 SOL (Save 50%)', callback_data: 'plan_monthly' }
          ],
          // [
          //   // { text: '🔥 6-Month – 4.5 SOL (Save 25%)', callback_data: 'plan_six_month' }
          // ],
          [
            { text: '⭐ Yearly – 8 SOL (Save 60%)', callback_data: 'plan_yearly' }
          ],
          [
            { text: '💎 Lifetime – 10 SOL (Save 75%)', callback_data: 'plan_lifetime' }
          ],
          [
            { text: '🔙 Back', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(plansMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      ctx.session.step = 'plan_selection';
    } catch (error) {
      logger.error('Error in back to plans:', error);
      await ctx.reply('Error loading plans. Please try again.');
    }
  });

  // Renew Subscription Handler
  bot.action('renew_subscription', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const renewMessage = `🔄 **Renew Your SURGE Subscription**

Extend your current plan or upgrade to a better one!

**Renewal Benefits:**
• 10% discount on yearly plans
• Uninterrupted service
• Keep all your settings
• Priority processing

Choose your renewal option:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📅 Monthly – 0.9 SOL (Save 50%)', callback_data: 'renew_monthly' }
          ],
          [
            // { text: '🔥 6-Month – 4.05 SOL (Save 60%)', callback_data: 'renew_six_month' }
          ],
          [
            { text: '⭐ Yearly – 7.2 SOL (Save 60%)', callback_data: 'renew_yearly' }
          ],
          [
            { text: '💎 Upgrade to Lifetime – 9 SOL (Save 75%)', callback_data: 'renew_lifetime' }
          ],
          [
            { text: '🔙 Back', callback_data: 'my_subscription' }
          ]
        ]
      };

      await ctx.editMessageText(renewMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in renew subscription:', error);
      await ctx.reply('Error loading renewal options. Please try again.');
    }
  });

  // /renew command
  bot.command('renew', async (ctx) => {
    try {
      const renewMessage = `🔄 **Renew Your SURGE Subscription**

Extend your current plan or upgrade to a better one!

**Renewal Benefits:**
• 10% discount on existing plans
• Uninterrupted service  
• Keep all your settings
• Priority processing

Choose your renewal option:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📅 Monthly – 0.9 SOL (Save 50%)', callback_data: 'renew_monthly' }
          ],
          [
            // { text: '🔥 6-Month – 4.05 SOL (10% off)', callback_data: 'renew_six_month' }
          ],
          [
            { text: '⭐ Yearly – 7.2 SOL (Save 60%)', callback_data: 'renew_yearly' }
          ],
          [
            { text: '💎 Upgrade to Lifetime – 9 SOL(Save 75%)', callback_data: 'renew_lifetime' }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(renewMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in renew command:', error);
      await ctx.reply('Error loading renewal options. Please try again.');
    }
  });

  // Handle renewal plan selections
  ['monthly', 'six_month', 'yearly', 'lifetime'].forEach(planType => {
    bot.action(`renew_${planType}`, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        
        const discountPrices = {
          monthly: 0.9,
          six_month: 4.05,
          yearly: 7.2,
          lifetime: 9.0
        };

        const plan = PLANS[planType === 'six_month' ? 'six_month' : planType];
        const renewalPrice = discountPrices[planType as keyof typeof discountPrices];
        
        ctx.session.selectedPlan = {
          type: plan.type,
          price: renewalPrice,
          duration: plan.duration,
          name: `${plan.name} (Renewal)`
        };

        const renewalMessage = `🔄 **${plan.name} Renewal** – ${renewalPrice} SOL

💰 **10% Renewal Discount Applied!**
Original Price: ${plan.price} SOL
Your Price: ${renewalPrice} SOL
You Save: ${(plan.price - renewalPrice).toFixed(1)} SOL

**Features:**
${plan.features.map(feature => `• ${feature}`).join('\n')}

Proceed with renewal payment?`;

        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '💳 Proceed to Payment', callback_data: 'proceed_to_payment' }
            ],
            [
              { text: '🔙 Back', callback_data: 'renew_subscription' }
            ]
          ]
        };

        await ctx.editMessageText(renewalMessage, { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        logger.error(`Error in renew ${planType}:`, error);
        await ctx.reply('Error processing renewal. Please try again.');
      }
    });
  });
} 