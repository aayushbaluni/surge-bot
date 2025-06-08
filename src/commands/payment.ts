import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { User, Transaction } from '../database';
import { SOLANA_WALLET_ADDRESS, ADMIN_CHAT_ID } from '../config/env';

export function setupPaymentCommands(bot: Telegraf<Context>) {
  bot.command('payment', async (ctx) => {
    try {
      if (!ctx.from) {
        await ctx.reply('Error: Could not identify user.');
        return;
      }

      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        await ctx.reply('Please use /start to initialize your account first.');
        return;
      }

      const paymentMessage = `💳 **Payment Instructions**

Send SOL to:
\`${SOLANA_WALLET_ADDRESS}\`

After payment, use /verify <txid> to verify your payment.`;
      
      await ctx.reply(paymentMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 View Plans', callback_data: 'view_plans' }
            ],
            [
              { text: '❓ Help', callback_data: 'help' }
            ]
          ]
        }
      });
    } catch (error) {
      logger.error('Error in payment command:', error);
      await ctx.reply('Error processing payment request. Please try again later.');
    }
  });

  bot.action('proceed_payment', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      if (!ctx.from) {
        await ctx.reply('Error: Could not identify user.');
        return;
      }

      const selectedPlan = ctx.session?.selectedPlan;
      if (!selectedPlan) {
        await ctx.reply('No plan selected. Please choose a plan first.');
        return;
      }

      // Check if user already has an active subscription
      const user = await User.findOne({ userId: ctx.from.id });
      if (user?.subscription?.isActive && user.subscription.endDate) {
        const endDate = new Date(user.subscription.endDate);
        const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0) {
          await ctx.reply(`You already have an active subscription that expires in ${daysLeft} days.\nUse /renew to extend your subscription.`);
          return;
        }
      }

      const paymentMessage = `💳 **Payment Instructions**

Send **${selectedPlan.price} SOL** to:
\`${SOLANA_WALLET_ADDRESS}\`

After payment, click **I've Paid** to proceed with verification.`;

      await ctx.editMessageText(paymentMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ I\'ve Paid', callback_data: 'payment_confirm' }
            ],
            [
              { text: '❌ Cancel', callback_data: 'cancel_payment' }
            ]
          ]
        }
      });

      ctx.session.step = 'payment';
      ctx.session.paymentDetails = {
        amount: selectedPlan.price,
        walletAddress: SOLANA_WALLET_ADDRESS
      };

    } catch (error) {
      logger.error('Error in proceed payment:', error);
      await ctx.reply('Error processing payment. Please try again.');
    }
  });

  bot.action('payment_confirm', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      if (!ctx.from) {
        await ctx.reply('Error: Could not identify user.');
        return;
      }

      const selectedPlan = ctx.session?.selectedPlan;
      if (!selectedPlan) {
        await ctx.reply('Session expired. Please choose a plan again.');
        return;
      }

      await ctx.editMessageText(
        'Please send your Solana transaction ID (TXID):',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '❌ Cancel', callback_data: 'cancel_payment' }
              ]
            ]
          }
        }
      );

      ctx.session.step = 'txid';
    } catch (error) {
      logger.error('Error in payment confirm:', error);
      await ctx.reply('Error processing payment confirmation. Please try again.');
    }
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session?.step === 'txid') {
      try {
        if (!ctx.from) {
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        const txId = ctx.message.text.trim();
        
        // Validate transaction ID format
        if (!txId || txId.length < 50 || !/^[A-Za-z0-9]{50,}$/.test(txId)) {
          await ctx.reply('Please provide a valid Solana transaction ID.');
          return;
        }

        // Check if transaction ID was already used
        const existingTx = await Transaction.findOne({ txId });
        if (existingTx) {
          await ctx.reply('This transaction ID has already been used. Please contact support if this is an error.');
          return;
        }

        const selectedPlan = ctx.session.selectedPlan;
        if (!selectedPlan) {
          await ctx.reply('Session expired. Please start over.');
          return;
        }

        // Create transaction record
        const transaction = await Transaction.create({
          userId: ctx.from.id,
          plan: selectedPlan.name,
          amount: selectedPlan.price,
          txId: txId,
          status: 'pending',
          createdAt: new Date(),
          walletAddress: SOLANA_WALLET_ADDRESS,
        });

        await ctx.reply(`✅ Payment received! Transaction ID: ${txId}

Your subscription will be activated within 1 hour after verification.

Use /help for more information.`);

        // Reset session
        ctx.session.step = 'complete';
        ctx.session.selectedPlan = undefined;
        ctx.session.paymentDetails = undefined;

        // Notify admin
        if (ADMIN_CHAT_ID) {
          const adminMessage = `💰 New Payment Received

User: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})
Plan: ${selectedPlan.name}
Amount: ${selectedPlan.price} SOL
TXID: ${txId}
Status: Pending verification

Use /verify_payment ${txId} to verify.`;

          try {
            await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMessage);
          } catch (error) {
            logger.error('Error notifying admin:', error);
          }
        }

      } catch (error) {
        logger.error('Error processing txid:', error);
        await ctx.reply('Error processing transaction. Please contact support.');
      }
    } else {
      return next();
    }
  });

  bot.action('cancel_payment', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      // Reset session
      ctx.session.step = 'welcome';
      ctx.session.selectedPlan = undefined;
      ctx.session.paymentDetails = undefined;
      
      await ctx.editMessageText('Payment cancelled. Use /plans to view available plans.');
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      await ctx.reply('Payment cancelled.');
    }
  });

  // Admin command to verify payments
  bot.command('verify_payment', async (ctx) => {
    try {
      if (!ctx.from || ctx.from.id.toString() !== ADMIN_CHAT_ID) {
        await ctx.reply('Access denied.');
        return;
      }

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('Usage: /verify_payment <transaction_id>');
        return;
      }

      const txId = args[1].trim();
      const transaction = await Transaction.findOne({ txId });

      if (!transaction) {
        await ctx.reply('Transaction not found.');
        return;
      }

      if (transaction.status === 'completed') {
        await ctx.reply('Transaction already verified.');
        return;
      }

      // Update transaction status
      transaction.status = 'completed';
      await transaction.save();

      // Calculate subscription end date
      const plan = transaction.plan;
      const durationDays = plan.includes('Monthly') ? 30 : 
                          plan.includes('6-Month') ? 180 :
                          plan.includes('Yearly') ? 365 :
                          plan.includes('Lifetime') ? 36500 : 30;

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      // Update user subscription
      await User.findOneAndUpdate(
        { userId: transaction.userId },
        {
          subscription: {
            plan: plan,
            startDate: new Date(),
            endDate: endDate,
            isActive: true
          }
        }
      );

      await ctx.reply(`✅ Payment verified for transaction ${txId}`);

      // Notify user
      try {
        await ctx.telegram.sendMessage(
          transaction.userId,
          `🎉 Your subscription is now active!
          
Plan: ${plan}
Valid until: ${endDate.toLocaleDateString()}

Use /dashboard to view your subscription details.`
        );
      } catch (error) {
        logger.error('Error notifying user:', error);
      }

    } catch (error) {
      logger.error('Error in verify payment:', error);
      await ctx.reply('Error verifying payment.');
    }
  });

  // Debug command for admins
  bot.command('debug_payments', async (ctx) => {
    try {
      if (!ctx.from || ctx.from.id.toString() !== ADMIN_CHAT_ID) {
        return;
      }

      const pendingTransactions = await Transaction.find({ status: 'pending' });
      
      if (pendingTransactions.length === 0) {
        await ctx.reply('No pending transactions.');
        return;
      }

      let message = '📋 Pending Transactions:\n\n';
      for (const tx of pendingTransactions) {
        message += `User: ${tx.userId}\nPlan: ${tx.plan}\nAmount: ${tx.amount} SOL\nTXID: ${tx.txId}\n\n`;
      }

      // Send fallback message if too long
      if (message.length > 4000) {
        const fallbackMessage = `📋 ${pendingTransactions.length} pending transactions found. Use /verify_payment <txid> to verify individual payments.`;
        await ctx.telegram.sendMessage(ADMIN_CHAT_ID, fallbackMessage);
      } else {
        await ctx.reply(message);
      }

    } catch (error) {
      logger.error('Error in debug payments:', error);
      await ctx.reply('Error fetching pending transactions.');
    }
  });
} 