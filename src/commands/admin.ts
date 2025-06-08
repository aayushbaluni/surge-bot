import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/logger';
import { User, Transaction } from '../database';
import { ADMIN_CHAT_ID } from '../config/env';

export function setupAdminCommands(bot: Telegraf<Context>) {
  // Admin stats command
  bot.command('stats', async (ctx) => {
    try {
      if (ctx.from?.id.toString() !== ADMIN_CHAT_ID) {
        await ctx.reply('🔒 Access denied. This command is only available to administrators.');
        return;
      }

      const [totalUsers, activeSubscriptions, totalTransactions] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ 'subscription.isActive': true }),
        Transaction.countDocuments({ status: 'completed' })
      ]);

      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5);

      const recentTransactions = await Transaction.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5);

      const totalRevenue = await Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const statsMessage = `📊 **SURGE Bot Statistics**

**📈 User Metrics:**
• Total Users: ${totalUsers}
• Active Subscriptions: ${activeSubscriptions}
• Subscription Rate: ${totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : 0}%

**💰 Revenue:**
• Total Transactions: ${totalTransactions}
• Total Revenue: ${totalRevenue[0]?.total || 0} SOL
• Average Revenue: ${totalTransactions > 0 ? ((totalRevenue[0]?.total || 0) / totalTransactions).toFixed(2) : 0} SOL

**📅 Recent Users:**
${recentUsers.map(user => `• @${user.username || 'N/A'} (${user.createdAt?.toLocaleDateString() || 'N/A'})`).join('\n')}

**💳 Recent Transactions:**
${recentTransactions.map(tx => `• ${tx.amount} SOL - ${tx.plan} (${tx.createdAt?.toLocaleDateString() || 'N/A'})`).join('\n')}`;

      await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error in stats command:', error);
      await ctx.reply('Error fetching statistics. Please try again.');
    }
  });

  // Admin broadcast command
  bot.command('broadcast', async (ctx) => {
    try {
      if (ctx.from?.id.toString() !== ADMIN_CHAT_ID) {
        await ctx.reply('🔒 Access denied.');
        return;
      }

      const message = ctx.message.text.replace('/broadcast ', '');
      if (!message || message === '/broadcast') {
        await ctx.reply('Usage: /broadcast <message>');
        return;
      }

      const users = await User.find({});
      let successCount = 0;
      let failCount = 0;

      await ctx.reply(`📢 Starting broadcast to ${users.length} users...`);

      for (const user of users) {
        try {
          await ctx.telegram.sendMessage(user.userId, message, { parse_mode: 'Markdown' });
          successCount++;
        } catch (error) {
          failCount++;
          logger.error(`Failed to send broadcast to user ${user.userId}:`, error);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await ctx.reply(`✅ Broadcast completed!
• Sent: ${successCount}
• Failed: ${failCount}
• Total: ${users.length}`);

    } catch (error) {
      logger.error('Error in broadcast command:', error);
      await ctx.reply('Error sending broadcast. Please try again.');
    }
  });

  // Admin user lookup command
  bot.command('user', async (ctx) => {
    try {
      if (ctx.from?.id.toString() !== ADMIN_CHAT_ID) {
        await ctx.reply('🔒 Access denied.');
        return;
      }

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('Usage: /user <user_id_or_username>');
        return;
      }

      const query = args[1];
      let user;

      // Try to find by user ID first, then by username
      if (/^\d+$/.test(query)) {
        user = await User.findOne({ userId: parseInt(query) });
      } else {
        user = await User.findOne({ username: query.replace('@', '') });
      }

      if (!user) {
        await ctx.reply('User not found.');
        return;
      }

      const transactions = await Transaction.find({ userId: user.userId });
      const totalSpent = transactions.reduce((sum, tx) => sum + (tx.status === 'completed' ? tx.amount : 0), 0);

      const userInfo = `👤 **User Information**

**Basic Info:**
• ID: ${user.userId}
• Username: @${user.username || 'N/A'}
• Name: ${user.firstName} ${user.lastName || ''}
• Joined: ${user.createdAt?.toLocaleDateString() || 'N/A'}
• Last Active: ${user.lastActive?.toLocaleDateString() || 'N/A'}

**Subscription:**
• Plan: ${user.subscription?.plan || 'None'}
• Status: ${user.subscription?.isActive ? '✅ Active' : '❌ Inactive'}
• Start: ${user.subscription?.startDate?.toLocaleDateString() || 'N/A'}
• End: ${user.subscription?.endDate?.toLocaleDateString() || 'N/A'}

**TradingView:**
• Username: ${user.tvUsername || 'Not set'}

**Financial:**
• Total Spent: ${totalSpent} SOL
• Transactions: ${transactions.length}
• Referral Code: ${user.referralCode}
• Referred By: ${user.referredBy || 'Direct'}

**Referral Stats:**
• Total Referrals: ${user.referralStats?.totalReferrals || 0}
• Total Earnings: ${user.referralStats?.totalEarnings || 0} SOL
• Pending Earnings: ${user.referralStats?.pendingEarnings || 0} SOL`;

      await ctx.reply(userInfo, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Error in user lookup command:', error);
      await ctx.reply('Error fetching user information. Please try again.');
    }
  });
} 