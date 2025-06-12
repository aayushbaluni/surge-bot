import { User } from '../database';
import { logger } from './logger';
import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { ADMIN_IDS } from '../config/env';

export class SubscriptionMonitor {
  private bot: Telegraf<Context>;
  private checkInterval: NodeJS.Timeout | null = null;
  private adminCheckInterval: NodeJS.Timeout | null = null;
  private processedExpiredUsers: Set<number> = new Set();

  constructor(bot: Telegraf<Context>) {
    this.bot = bot;
  }

  public startMonitoring(intervalMinutes: number = 60) {
    // Clear any existing intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.adminCheckInterval) {
      clearInterval(this.adminCheckInterval);
    }

    // Run initial checks
    this.checkExpiredSubscriptions();
    this.checkExpiredSubscriptionsForAdmin();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkExpiredSubscriptions();
    }, intervalMinutes * 60 * 1000);

    // Set up admin notification check (every 30 minutes)
    this.adminCheckInterval = setInterval(() => {
      this.checkExpiredSubscriptionsForAdmin();
    }, 30 * 60 * 1000);

    logger.info(`Subscription monitoring started with ${intervalMinutes} minute interval`);
    logger.info('Admin notification system started with 30 minute interval');
  }

  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.adminCheckInterval) {
      clearInterval(this.adminCheckInterval);
      this.adminCheckInterval = null;
    }
    logger.info('Subscription monitoring stopped');
  }

  private async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      
      // Find users with active subscriptions that are about to expire or have expired
      const users = await User.find({
        'subscription.isActive': true,
        'subscription.endDate': { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } // Check for subscriptions expiring in next 24 hours
      });

      logger.info(`Found ${users.length} users with expiring/expired subscriptions`);

      for (const user of users) {
        try {
          const timeUntilExpiry = user.subscription.endDate.getTime() - now.getTime();
          const hoursUntilExpiry = Math.floor(timeUntilExpiry / (60 * 60 * 1000));

          let message = '';
          if (timeUntilExpiry <= 0) {
            // Subscription has expired
            message = `⚠️ Your SURGE subscription has expired!\n\n` +
                     `To continue enjoying our premium features, please renew your subscription using the /renew command.`;
            
            // Update user's subscription status
            user.subscription.isActive = false;
            await user.save();
          } else {
            // Subscription is about to expire
            message = `🔔 Subscription Expiring Soon!\n\n` +
                     `Your SURGE subscription will expire in ${hoursUntilExpiry} hours.\n` +
                     `To avoid any interruption in service, please renew your subscription using the /renew command.`;
          }

          // Send notification to user
          await this.bot.telegram.sendMessage(user.userId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Renew Subscription', callback_data: 'renew_subscription' }],
                [{ text: '📊 View Plans', callback_data: 'view_plans' }]
              ]
            }
          });

          logger.info(`Sent expiration notification to user ${user.userId}`);
        } catch (error) {
          logger.error(`Error sending notification to user ${user.userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
    }
  }

  private async checkExpiredSubscriptionsForAdmin() {
    try {
      const now = new Date();
      
      // Find users with expired subscriptions
      const expiredUsers = await User.find({
        'subscription.isActive': false,
        'subscription.endDate': { $lt: now },
        tvUsername: { $exists: true, $ne: null }
      });

      logger.info(`Found ${expiredUsers.length} users with expired subscriptions requiring TV access removal`);

      for (const user of expiredUsers) {
        // Skip if we've already processed this user
        if (this.processedExpiredUsers.has(user.userId)) {
          continue;
        }

        try {
          const adminMessage = `🚨 **TradingView Access Removal Required**\n\n` +
                             `User ID: ${user.userId}\n` +
                             `Username: ${user.username || 'N/A'}\n` +
                             `TV Username: ${user.tvUsername}\n` +
                             `Expired On: ${user.subscription.endDate.toLocaleString()}\n\n` +
                             `Please remove this user's TradingView access.`;

          // Send notification to all admins
          for (const adminId of ADMIN_IDS) {
            await this.bot.telegram.sendMessage(adminId, adminMessage, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Mark as Processed', callback_data: `processed_${user.userId}` }]
                ]
              }
            });
          }

          // Add user to processed set
          this.processedExpiredUsers.add(user.userId);

          // Clean up old entries from processed set (older than 7 days)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          for (const userId of this.processedExpiredUsers) {
            const user = await User.findOne({ userId });
            if (user && user.subscription.endDate < sevenDaysAgo) {
              this.processedExpiredUsers.delete(userId);
            }
          }

          logger.info(`Sent admin notification for expired user ${user.userId}`);
        } catch (error) {
          logger.error(`Error sending admin notification for user ${user.userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking expired subscriptions for admin:', error);
    }
  }
} 