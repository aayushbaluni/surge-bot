import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { User, Transaction, AffiliateReward } from '../database';
import { SOLANA_WALLET_ADDRESS, ADMIN_CHAT_ID, QUICKNODE_RPC_URL } from '../config/env';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Initialize Solana connection
const connection = new Connection(QUICKNODE_RPC_URL, 'confirmed');

// Function to verify Solana transaction
async function verifySolanaTransaction(txId: string, expectedAmount: number) {
  try {
    logger.info('Fetching transaction details from Solana:', { txId });
    
    // Fetch transaction details from Solana
    const tx = await connection.getParsedTransaction(txId, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      logger.warn('Transaction not found on Solana network:', { txId });
      return { success: false, error: 'Transaction not found on blockchain' };
    }

    // Verify receiver address
    const expectedReceiver = new PublicKey(SOLANA_WALLET_ADDRESS);
    let foundCorrectReceiver = false;
    let actualAmount = 0;
    let sender = '';

    logger.info('Verifying transaction:', {
      txId,
      expectedReceiver: expectedReceiver.toString()
    });

    // Check all instructions in the transaction
    for (const instruction of tx.transaction.message.instructions) {
      // Check if this is a system transfer instruction
      if ('parsed' in instruction && 
          instruction.programId.equals(new PublicKey('11111111111111111111111111111111')) && 
          instruction.parsed.type === 'transfer') {
        const transferInfo = instruction.parsed.info;
        const destination = new PublicKey(transferInfo.destination);
        const amount = transferInfo.lamports / LAMPORTS_PER_SOL; // Convert lamports to SOL
        sender = transferInfo.authority || transferInfo.source;

        logger.info('Checking transfer:', {
          destination: destination.toString(),
          amount,
          sender
        });

        // Check if this is a transfer to our wallet
        if (destination.equals(expectedReceiver)) {
          foundCorrectReceiver = true;
          actualAmount = amount;
          logger.info('Found matching transfer:', {
            destination: destination.toString(),
            amount,
            sender
          });
          break;
        }
      }
    }

    if (!foundCorrectReceiver) {
      logger.error('Receiver address mismatch:', {
        expected: expectedReceiver.toString(),
        txId
      });
      return { success: false, error: 'Transaction receiver address mismatch' };
    }

    // Verify amount
    if (actualAmount < expectedAmount) {
      logger.error('Amount mismatch:', {
        expected: expectedAmount,
        received: actualAmount,
        txId
      });
      return { 
        success: false, 
        error: `Transaction amount mismatch. Expected: ${expectedAmount} SOL, Received: ${actualAmount} SOL`
      };
    }

    return {
      success: true,
      data: {
        amount: actualAmount,
        sender,
        receiver: expectedReceiver.toString()
      }
    };
  } catch (error) {
    logger.error('Error verifying Solana transaction:', {
      error,
      txId
    });
    return { success: false, error: 'Error verifying transaction on blockchain' };
  }
}

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

      ctx.session.step = 'awaiting_txid';
    } catch (error) {
      logger.error('Error in payment confirm:', error);
      await ctx.reply('Error processing payment confirmation. Please try again.');
    }
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session?.step === 'awaiting_txid') {
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

        // Verify transaction on blockchain
        const verificationResult = await verifySolanaTransaction(txId, selectedPlan.price);
        if (!verificationResult.success) {
          await ctx.reply(`❌ ${verificationResult.error}`);
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
        await transaction.save();

        await ctx.reply(`✅ Payment received! Transaction ID: ${txId}

Your subscription will be activated within 1 hour after verification.

Please provide your TradingView username to complete the process.

Use /help for more information.`);

        // Reset session
        ctx.session.step = 'awaiting_tv_username';
        ctx.session.pendingTxId = txId;

      } catch (error) {
        logger.error('Error processing txid:', error);
        await ctx.reply('Error processing transaction. Please contact support.');
      }
    } else if (ctx.session?.step === 'awaiting_tv_username') {
      try {
        if (!ctx.from) {
          await ctx.reply('Error: Could not identify user.');
          return;
        }

        const tvUsername = ctx.message.text.trim();
        
        // Basic validation for TradingView username
        if (!tvUsername || tvUsername.length < 3) {
          await ctx.reply('Please provide a valid TradingView username (minimum 3 characters).');
          return;
        }

        // Find pending transaction for this user
        const transaction = await Transaction.findOne({ 
          userId: ctx.from.id,
          status: 'pending'
        });

        if (!transaction) {
          await ctx.reply('No pending transaction found. Please contact support if you believe this is an error.');
          return;
        }

        // Update user's TradingView username
        const user = await User.findOneAndUpdate(
          { userId: ctx.from.id },
          { tvUsername: tvUsername },
          { new: true }
        );

        if (!user) {
          await ctx.reply('Error: User not found.');
          return;
        }

        // Notify admin with all details
        if (ADMIN_CHAT_ID) {
          const adminMessage = `💰 New Payment Received

User: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})
Plan: ${transaction.plan}
Amount: ${transaction.amount} SOL
TXID: ${transaction.txId}
TradingView Username: ${tvUsername}
Status: Pending verification

Use /verify_payment ${transaction.txId} to verify the payment.`;

          try {
            await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMessage);
          } catch (error) {
            logger.error('Error notifying admin:', error);
          }
        }

        await ctx.reply('✅ TradingView username saved successfully! Your subscription will be activated after admin verification.');

        // Reset session
        ctx.session.step = 'complete';
        ctx.session.selectedPlan = undefined;
        ctx.session.paymentDetails = undefined;
        ctx.session.pendingTxId = undefined;

      } catch (error) {
        logger.error('Error processing TradingView username:', error);
        await ctx.reply('Error processing TradingView username. Please try again or contact support.');
      }
    } else {
      return next();
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

      // Get user details
      const user = await User.findOne({ userId: transaction.userId });
      if (!user) {
        await ctx.reply('Error: User not found.');
        return;
      }

      // Check if user has provided TradingView username
      if (!user.tvUsername) {
        await ctx.reply('Error: TradingView username not found for this user. Please ask the user to provide their TradingView username first.');
        return;
      }

      // Update transaction status
      transaction.status = 'completed';
      await transaction.save();

      // Calculate subscription end date
      const plan = transaction.plan;
      const durationDays = plan.includes('Trial') ? 1 : 
                          plan.includes('Monthly') ? 30 : 
                          plan.includes('6-Month') ? 180 :
                          plan.includes('Yearly') ? 365 :
                          plan.includes('Lifetime') ? 36500 : 1;

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      // Update user subscription
      await User.findOneAndUpdate(
        { userId: transaction.userId },
        {
          subscription: {
            plan: plan,
            startDate: startDate,
            endDate: endDate,
            isActive: true
          }
        }
      );

      // Process referral reward if user was referred
      const referredUser = await User.findOne({ userId: transaction.userId });
      if (referredUser?.referredBy) {
        try {
          // Calculate reward amount (10% of transaction amount)
          const rewardAmount = transaction.amount * 0.1;

          // Create referral reward
          const reward = await AffiliateReward.create({
            userId: referredUser.referredBy,
            referredUserId: transaction.userId,
            amount: rewardAmount,
            status: 'pending',
            createdAt: new Date()
          });

          logger.info(`Created affiliate reward:`, {
            rewardId: reward._id,
            referrerId: referredUser.referredBy,
            referredUserId: transaction.userId,
            amount: rewardAmount
          });

          // Update referrer's stats
          await User.findOneAndUpdate(
            { userId: referredUser.referredBy },
            {
              $inc: {
                'affiliateStats.totalEarnings': rewardAmount,
                'affiliateStats.pendingEarnings': rewardAmount,
                'affiliateStats.successfulAffiliates': 1,
                'affiliateStats.totalAffiliates': 1
              }
            }
          );

          // Notify referrer about the reward
          try {
            const referrer = await User.findOne({ userId: referredUser.referredBy });
            if (referrer) {
              const rewardMessage = `🎉 *New Affiliate Reward!*

You've earned ${rewardAmount} SOL from a successful referral!

*Details:*
• Referred User: ${referredUser.username || 'Anonymous'}
• Plan: ${transaction.plan}
• Amount: ${rewardAmount} SOL
• Status: Pending

Your total earnings: ${referrer.affiliateStats?.totalEarnings || 0} SOL
Pending rewards: ${referrer.affiliateStats?.pendingEarnings || 0} SOL

Use /affiliate to view your complete stats.`;

              await ctx.telegram.sendMessage(referredUser.referredBy, rewardMessage, {
                parse_mode: 'Markdown'
              });
              logger.info(`Sent reward notification to referrer ${referredUser.referredBy}`);
            }
          } catch (error) {
            logger.error('Error sending reward notification:', error);
          }

        } catch (error) {
          logger.error('Error processing affiliate reward:', error);
        }
      }

      await ctx.reply(`✅ Payment verified for transaction ${txId}`);

      // Notify user
      try {
        await ctx.telegram.sendMessage(
          transaction.userId,
          `🎉 Your subscription is now active!
          
Plan: ${plan}
Start Date: ${startDate.toLocaleDateString()}
Valid until: ${endDate.toLocaleDateString()}
TradingView Username: ${user.tvUsername}

Use /subscription to view your subscription details.`
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
} 