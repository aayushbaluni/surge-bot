import { Telegraf } from 'telegraf';
import { Context } from '@/types';
import { logger } from './utils/logger';
import { CHANNEL_USERNAME, ENV } from './config/env';

export function setupMiddleware(bot: Telegraf<Context>) {
  // Rate limiting middleware
  const userRequests = new Map<number, number[]>();
  const RATE_LIMIT = 20; // requests
  const RATE_WINDOW = 60000; // 1 minute in milliseconds

  // Combined logging and error handling middleware
  bot.use(async (ctx, next) => {
    const start = new Date();
    const userId = ctx.from?.id;

    // Log incoming update
    logger.info(`Incoming update: ${ctx.updateType}`, {
      userId,
      username: ctx.from?.username,
      messageText: 'message' in ctx.update && 'text' in ctx.update.message ? ctx.update.message.text : undefined
    });

    // Rate limiting check
    if (userId) {
      const now = Date.now();
      const userTimestamps = userRequests.get(userId) || [];
      const recentRequests = userTimestamps.filter(time => now - time < RATE_WINDOW);
      
      if (recentRequests.length >= RATE_LIMIT) {
        logger.warn(`Rate limit exceeded for user ${userId}`);
        await ctx.reply('⚠️ Too many requests. Please try again in a minute.');
        return;
      }
      
      recentRequests.push(now);
      userRequests.set(userId, recentRequests);
    }

    try {
      // Initialize session if not exists
      if (!ctx.session) {
        logger.info('Initializing new session for user', { userId });
        ctx.session = {
          step: 'welcome',
          userId: userId,
          selectedPlan: undefined,
          paymentDetails: undefined,
          tvUsername: undefined,
          dashboardToken: undefined,
          lastActivity: Date.now(),
          isChannelMember: false
        };
      } else {
        logger.info('Using existing session', { 
          userId,
          step: ctx.session.step,
          lastActivity: ctx.session.lastActivity
        });
      }

      // Update last activity timestamp
      ctx.session.lastActivity = Date.now();

      // Verify channel membership if channel username is configured
      if (CHANNEL_USERNAME && ctx.from) {
        try {
          logger.info(`Verifying channel membership for user ${ctx.from.id}`);
          const chatMember = await ctx.telegram.getChatMember(CHANNEL_USERNAME, ctx.from.id);
          ctx.session.isChannelMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
          logger.info(`Channel membership status for user ${ctx.from.id}: ${ctx.session.isChannelMember}`);
        } catch (error) {
          logger.warn('Channel verification skipped:', error);
          ctx.session.isChannelMember = false;
        }
      }
      
      // Process the update
      await next();
      
      // Log successful request
      const ms = new Date().getTime() - start.getTime();
      const logData: Record<string, any> = {
        updateType: ctx.updateType,
        userId: ctx.from?.id,
        username: ctx.from?.username,
        processingTime: ms,
        sessionStep: ctx.session?.step
      };

      // Add message details if available
      if ('message' in ctx.update && ctx.update.message) {
        if ('text' in ctx.update.message) {
          logData.messageText = ctx.update.message.text;
        }
        if ('type' in ctx.update.message) {
          logData.messageType = ctx.update.message.type;
        }
      }

      logger.info(`${ctx.updateType} update processed in ${ms}ms`, logData);
    } catch (error: unknown) {
      // Log error and send user-friendly message
      logger.error('Error in middleware:', error);
      try {
        const errorMessage = ENV.NODE_ENV === 'production' 
          ? 'Sorry, something went wrong. Please try again later or contact support.'
          : `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        await ctx.reply(errorMessage);
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  });

  // Cleanup rate limiting data periodically
  setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamps] of userRequests.entries()) {
      const recentRequests = timestamps.filter(time => now - time < RATE_WINDOW);
      if (recentRequests.length === 0) {
        userRequests.delete(userId);
      } else {
        userRequests.set(userId, recentRequests);
      }
    }
  }, RATE_WINDOW);
} 