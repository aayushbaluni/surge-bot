import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { User, ReferralReward } from '../database';
import { logger } from '../utils/logger';
import { ADMIN_CHAT_ID } from '../config/env';

export function setupReferralCommands(bot: Telegraf<Context>) {
  logger.info('Setting up referral commands...');

  // Handle /referral command
  bot.command('referral', async (ctx) => {
    logger.info('Referral command received', { 
      userId: ctx.from.id,
      username: ctx.from.username
    });

    try {
      if (!ctx.from) {
        logger.error('No user context in referral command');
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

      const totalPending = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

      const referralMessage = `🎯 Your Referral Program

Your Referral Code: <code>${user.referralCode}</code>

Share this link to invite others:
https://t.me/${ctx.botInfo.username}?start=${user.referralCode}

📊 Your Referral Stats:
• Total Earnings: ${user.referralStats?.totalEarnings || 0} SOL
• Pending Earnings: ${totalPending} SOL
• Total Referrals: ${user.referralStats?.totalReferrals || 0}
• Successful Referrals: ${user.referralStats?.successfulReferrals || 0}

💰 You earn 10% of every successful purchase made through your referral!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💳 Set Wallet Address', callback_data: 'set_wallet' },
            { text: '📊 View Rewards', callback_data: 'view_rewards' }
          ],
          [
            { text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      logger.info('Sending referral message', { 
        userId: ctx.from.id,
        hasKeyboard: true
      });

      await ctx.reply(referralMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      logger.info('Referral message sent successfully', { userId: ctx.from.id });
    } catch (error) {
      logger.error('Error in referral command:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: ctx.from?.id
      });
      await ctx.reply('Sorry, there was an error. Please try again or use /start to initialize the bot.');
    }
  });

  // Handle referral program button
  bot.action('referral_program', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Please use /referral to view your referral program details and stats.');
    } catch (error) {
      logger.error('Error in referral program action:', error);
      await ctx.reply('Sorry, there was an error. Please try again.');
    }
  });

  // Handle set wallet button
  bot.action('set_wallet', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Please send your Solana wallet address where you want to receive your referral rewards.');
      ctx.session.step = 'set_wallet';
    } catch (error) {
      logger.error('Error in set wallet action:', error);
      await ctx.reply('Sorry, there was an error. Please try again.');
    }
  });

  // Handle view rewards button
  bot.action('view_rewards', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const rewards = await ReferralReward.find({ 
        userId: ctx.from.id,
        status: 'pending'
      }).sort({ createdAt: -1 });

      if (rewards.length === 0) {
        await ctx.reply('You have no pending rewards.');
        return;
      }

      let message = '💰 Your Pending Rewards:\n\n';
      rewards.forEach((reward, index) => {
        message += `${index + 1}. ${reward.amount} SOL\n`;
        message += `   Date: ${reward.createdAt.toLocaleDateString()}\n\n`;
      });

      message += 'To receive your rewards, please set your wallet address using the "Set Wallet Address" button.';

      const keyboard = {
        inline_keyboard: [
          [{ text: '💳 Set Wallet Address', callback_data: 'set_wallet' }],
          [{ text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }]
        ]
      };

      await ctx.reply(message, { reply_markup: keyboard });
    } catch (error) {
      logger.error('Error in view rewards action:', error);
      await ctx.reply('Sorry, there was an error. Please try again.');
    }
  });

  // Handle wallet address input
  bot.hears(/^.+$/, async (ctx) => {
    try {
      if (ctx.session.step !== 'set_wallet') {
        return;
      }

      const walletAddress = ctx.message.text.trim();
      
      // Basic Solana address validation
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        await ctx.reply('Invalid Solana wallet address. Please try again.');
        return;
      }

      await User.findOneAndUpdate(
        { userId: ctx.from.id },
        { walletAddress }
      );

      // Get pending rewards
      const pendingRewards = await ReferralReward.find({
        userId: ctx.from.id,
        status: 'pending'
      });

      const totalPending = pendingRewards.reduce((sum: number, reward: { amount: number }) => sum + reward.amount, 0);

      const confirmationMessage = `✅ Your wallet address has been saved!\n\nWallet: <code>${walletAddress}</code>\nPending Rewards: ${totalPending} SOL\n\nClick below to redeem your rewards:`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '💰 Redeem Rewards', callback_data: 'redeem_rewards' }],
          [{ text: '🔄 Back to Main Menu', callback_data: 'back_to_main' }]
        ]
      };

      await ctx.reply(confirmationMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      ctx.session.step = 'welcome';
    } catch (error) {
      logger.error('Error in wallet address input:', error);
      await ctx.reply('Sorry, there was an error. Please try again.');
    }
  });

  // Handle redeem rewards button
  bot.action('redeem_rewards', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user?.walletAddress) {
        await ctx.reply('Please set your wallet address first using the "Set Wallet Address" button.');
        return;
      }

      const pendingRewards = await ReferralReward.find({
        userId: ctx.from.id,
        status: 'pending'
      });

      if (pendingRewards.length === 0) {
        await ctx.reply('You have no pending rewards to redeem.');
        return;
      }

      const totalPending = pendingRewards.reduce((sum: number, reward: { amount: number }) => sum + reward.amount, 0);

      // Notify admin about redemption request
      if (ADMIN_CHAT_ID) {
        const adminMessage = `🔔 New Rewards Redemption Request\n\nUser: @${user.username || 'unknown'}\nWallet: <code>${user.walletAddress}</code>\nTotal Amount: ${totalPending} SOL\n\nClick below to process rewards:`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '💸 Process Rewards', callback_data: `process_rewards_${ctx.from.id}` }]
          ]
        };

        await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }

      await ctx.reply('✅ Your redemption request has been submitted! The admin will process your rewards shortly.');
    } catch (error) {
      logger.error('Error in redeem rewards action:', error);
      await ctx.reply('Sorry, there was an error. Please try again.');
    }
  });

  // Handle process rewards (admin only)
  bot.action(/^process_rewards_(\d+)$/, async (ctx) => {
    try {
      const userId = parseInt(ctx.match[1]);
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('User not found');
        return;
      }

      const pendingRewards = await ReferralReward.find({
        userId,
        status: 'pending'
      });

      if (pendingRewards.length === 0) {
        await ctx.answerCbQuery('No pending rewards');
        return;
      }

      const totalAmount = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

      const adminMessage = `💰 Process Rewards for @${user.username || 'N/A'}

Total Amount: ${totalAmount} SOL
Wallet Address: <code>${user.walletAddress}</code>

Click below to confirm payment:`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '✅ Confirm Payment', callback_data: `confirm_payment_${userId}` }]
        ]
      };

      await ctx.editMessageText(adminMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error('Error in process rewards action:', error);
      await ctx.answerCbQuery('Error processing rewards');
    }
  });

  // Handle confirm payment (admin only)
  bot.action(/^confirm_payment_(\d+)$/, async (ctx) => {
    try {
      const userId = parseInt(ctx.match[1]);
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('User not found');
        return;
      }

      const pendingRewards = await ReferralReward.find({
        userId,
        status: 'pending'
      });

      if (pendingRewards.length === 0) {
        await ctx.answerCbQuery('No pending rewards');
        return;
      }

      const totalAmount = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

      // Update rewards status
      await ReferralReward.updateMany(
        { userId, status: 'pending' },
        { 
          status: 'paid',
          paymentTxId: `PAID_${Date.now()}`,
          updatedAt: new Date()
        }
      );

      // Update user's referral stats
      await User.findOneAndUpdate(
        { userId },
        {
          $inc: {
            'referralStats.totalEarnings': totalAmount,
            'referralStats.pendingEarnings': -totalAmount
          }
        }
      );

      // Notify user
      await ctx.telegram.sendMessage(
        userId,
        `✅ Your referral rewards have been paid!\n\nAmount: ${totalAmount} SOL\nWallet: <code>${user.walletAddress}</code>\n\nThank you for being part of our referral program! 🎉`,
        { parse_mode: 'HTML' }
      );

      // Update admin message
      await ctx.editMessageText(
        `✅ Rewards paid successfully!\n\nUser: @${user.username || 'N/A'}\nAmount: ${totalAmount} SOL\nWallet: <code>${user.walletAddress}</code>\n\nPayment completed at: ${new Date().toLocaleString()}`,
        { parse_mode: 'HTML' }
      );

      await ctx.answerCbQuery('Payment confirmed');
    } catch (error) {
      logger.error('Error in confirm payment action:', error);
      await ctx.answerCbQuery('Error confirming payment');
    }
  });
} 