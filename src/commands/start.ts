import { Telegraf } from 'telegraf';
import { Context, PLANS, SOLANA_WALLET_ADDRESS } from '../types';
import { logger } from '../utils/logger';
import { User, Transaction, ReferralReward } from '../database';
import { PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import axios from 'axios';
import { InlineKeyboardMarkup } from 'telegraf/types';
import { 
  ENV, 
  QUICKNODE_RPC_URL, 
  ADMIN_CHAT_ID, 
  COINGECKO_API_KEY,
  WEBSITE_URL,
  TWITTER_URL,
  SURGE_ANNOUNCEMENTS_CHANNEL,
  SUPPORT_EMAIL
} from '../config/env';

// Initialize Solana connection
const connection = new Connection(QUICKNODE_RPC_URL, 'confirmed');

// Function to get current SOL price in USD
async function getSolPrice(): Promise<number> {
  try {
    const url = COINGECKO_API_KEY 
      ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&x_cg_pro_api_key=${COINGECKO_API_KEY}`
      : 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
    
    const response = await axios.get(url);
    return response.data.solana.usd;
  } catch (error) {
    logger.error('Error fetching SOL price:', error);
    return 150; // Fallback price
  }
}

// Function to verify Solana transaction
async function verifyTransaction(txId: string, expectedAmount: number): Promise<boolean> {
  try {
    const transaction = await connection.getTransaction(txId, { commitment: 'confirmed' });
    if (!transaction) return false;
    
    // Check if transaction is confirmed
    if (!transaction.meta?.status?.Ok) return false;

    // Get the receiver address from the transaction
    const receiverAddress = transaction.meta.postBalances[0].toString();
    const expectedReceiver = SOLANA_WALLET_ADDRESS;

    // Verify receiver address matches our wallet
    if (receiverAddress !== expectedReceiver) {
      logger.error('Transaction receiver address mismatch', {
        expected: expectedReceiver,
        received: receiverAddress
      });
      return false;
    }

    // Calculate the actual amount received
    const preBalance = transaction.meta.preBalances[0];
    const postBalance = transaction.meta.postBalances[0];
    const actualAmount = (postBalance - preBalance) / LAMPORTS_PER_SOL;

    // Verify the amount matches expected amount
    if (Math.abs(actualAmount - expectedAmount) > 0.001) { // Allow 0.001 SOL difference for fees
      logger.error('Transaction amount mismatch', {
        expected: expectedAmount,
        received: actualAmount
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error verifying transaction:', error);
    return false;
  }
}

export function setupStartCommand(bot: Telegraf<Context>) {
  
  // /start command - Entry Point
  bot.command('start', async (ctx) => {
    try {
      // Check for referral code
      const startPayload = ctx.message.text.split(' ')[1];
      let referredBy = null;

      if (startPayload) {
        const referrer = await User.findOne({ referralCode: startPayload });
        if (referrer) {
          referredBy = referrer.userId;
          logger.info(`User ${ctx.from.id} referred by ${referrer.userId}`);
        }
      }

      // Initialize or update user
      const user = await User.findOneAndUpdate(
        { userId: ctx.from.id },
        {
          userId: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          lastActive: new Date(),
          referredBy: referredBy
        },
        { upsert: true, new: true }
      );

      // Reset session
      ctx.session = {
        step: 'welcome',
        selectedPlan: undefined,
        paymentDetails: undefined,
        tvUsername: undefined,
        dashboardToken: undefined,
        userId: ctx.from.id
      };

      const welcomeMessage = `👋 Welcome to **SURGE Bot** – your all-in-one AI trading assistant in Telegram.
Choose an option below to get started:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 Get Access Now', callback_data: 'view_plans' },
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🌐 Website', url: WEBSITE_URL }
          ],
          [
            { text: '🐦 Twitter', url: TWITTER_URL }
          ],
          [
            { text: '🤝 Affiliate Program', callback_data: 'affiliate_program' }
          ]
        ]
      };

      await ctx.reply(welcomeMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // Notify admin about new user
      if (ADMIN_CHAT_ID) {
        try {
          const username = ctx.from.username ? `@${ctx.from.username}` : 'N/A';
          const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
          
          await ctx.telegram.sendMessage(
            ADMIN_CHAT_ID,
            `<b>👤 New user started SURGE Bot:</b>
<b>ID:</b> ${ctx.from.id}
<b>Username:</b> ${username}
<b>Name:</b> ${fullName || 'N/A'}
<b>Referred by:</b> ${referredBy ? `User ${referredBy}` : 'Direct'}`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          logger.error('Failed to notify admin about new user:', error);
        }
      }

      // Process referral reward if applicable
      if (referredBy) {
        try {
          await User.findOneAndUpdate(
            { userId: referredBy },
            { $inc: { 'referralStats.totalReferrals': 1 } }
          );
          logger.info(`Incremented referral count for user ${referredBy}`);
        } catch (error) {
          logger.error('Error processing referral:', error);
        }
      }

    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('Welcome to SURGE Bot! Use /menu to see available options.');
    }
  });

  // /menu command - Main Menu
  bot.command('menu', async (ctx) => {
    try {
      const menuMessage = `🚀 **SURGE Bot Main Menu**

Power your trades with SURGE: AI-driven signals, private communities & seamless SOL payments—all inside Telegram.

Choose an option:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 View Plans', callback_data: 'view_plans' },
            { text: '📈 My Subscription', callback_data: 'my_subscription' }
          ],
          [
            { text: '🔄 Renew', callback_data: 'renew_subscription' },
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🤝 Affiliate Program', callback_data: 'affiliate_program' }
          ],
          [
            { text: '🐦 Twitter', url: TWITTER_URL }
          ]
        ]
      };

      await ctx.reply(menuMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in menu command:', error);
      await ctx.reply('Error loading menu. Please try again.');
    }
  });

  // Setup additional commands and handlers
  setupAdditionalCommands(bot);

  // Handle callback queries for menu buttons
  bot.action('my_subscription', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Redirecting to subscription details...');
      await ctx.telegram.sendMessage(ctx.chat.id, '/subscription');
    } catch (error) {
      logger.error('Error in my_subscription action:', error);
      await ctx.reply('Error loading subscription details. Please try /subscription command.');
    }
  });

  bot.action('renew_subscription', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Redirecting to renewal options...');
      await ctx.telegram.sendMessage(ctx.chat.id, '/renew');
    } catch (error) {
      logger.error('Error in renew_subscription action:', error);
      await ctx.reply('Error loading renewal options. Please try /renew command.');
    }
  });
}

function setupAdditionalCommands(bot: Telegraf<Context>) {
  
  // /invite command
  bot.command('invite', async (ctx) => {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      
      if (!user?.affiliateCode) {
        await ctx.reply('Error: Affiliate code not found. Please contact support.');
        return;
      }

      const botUsername = ctx.botInfo?.username || 'SURGEBot';
      const inviteLink = `https://t.me/${botUsername}?start=${user.affiliateCode}`;
      
      const inviteMessage = `🤝 **Invite Friends to SURGE**

Share your affiliate link and earn rewards!

**Your Affiliate Link:**
\`${inviteLink}\`

**How it works:**
• Share your link with friends
• Get 10% commission on their purchases
• Lifetime earnings from your affiliates

Use /affiliate to track your earnings and affiliates.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📊 View Affiliate Stats', callback_data: 'affiliate_program' }
          ],
          [
            { text: '📱 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join SURGE Bot for AI trading signals!')}` }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(inviteMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in invite command:', error);
      await ctx.reply('Error generating invite link. Please try again.');
    }
  });

  // /terms command
  bot.command('terms', async (ctx) => {
    try {
      const termsMessage = `📋 **Terms of Service**

**SURGE Bot Terms & Conditions**

**1. Service Description**
SURGE Bot provides AI-powered trading signals for educational purposes only. We do not provide financial advice.

**2. Subscription Terms**
• Subscriptions are non-refundable after 24 hours
• Access granted within 1 hour of payment verification
• Renewals offer 10% discount for existing users

**3. User Responsibilities**
• Provide accurate TradingView username
• Trade responsibly and manage risk
• Do not share account access

**4. Signal Disclaimer**
• Signals are for educational purposes
• Past performance doesn't guarantee future results
• Always do your own research (DYOR)

**5. Payment Terms**
• Payments accepted in SOL only
• Transactions are processed on Solana blockchain
• No chargebacks possible due to blockchain nature

**6. Privacy & Data**
• We store minimal user data
• No trading data is collected
• Telegram handles authentication

**7. Liability**
SURGE Bot is not liable for trading losses. Use signals at your own risk.

**Last Updated:** December 2024

For questions, contact: ${SUPPORT_EMAIL}`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '🔒 Privacy Policy', callback_data: 'privacy_policy' }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(termsMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in terms command:', error);
      await ctx.reply('Error loading terms of service. Please try again.');
    }
  });

  // /privacy command
  bot.command('privacy', async (ctx) => {
    try {
      const privacyMessage = `🔒 **Privacy Policy**

**SURGE Bot Privacy Policy**

**Information We Collect:**
• Telegram user ID and username
• TradingView username (provided by user)
• Subscription status and payment records
• Bot usage analytics

**How We Use Information:**
• Provide bot services and trading signals
• Process subscriptions and payments
• Send relevant updates and notifications
• Improve our services

**Information We Don't Collect:**
• Personal trading data
• Wallet private keys
• Sensitive financial information
• Location data

**Data Sharing:**
• We don't sell or share personal data
• Payment data secured via blockchain
• Anonymous usage statistics only

**Data Security:**
• Encrypted data storage
• Secure API communications
• Regular security audits
• No password storage required


**Cookies & Tracking:**
• No web cookies used
• Telegram handles authentication
• Anonymous bot analytics only

**Contact Us:**
For privacy questions: ${SUPPORT_EMAIL}

**Last Updated:** December 2024`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 Terms of Service', callback_data: 'terms_service' }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(privacyMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in privacy command:', error);
      await ctx.reply('Error loading privacy policy. Please try again.');
    }
  });

  // Handle callback queries for terms and privacy
  bot.action('terms_service', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await showTermsOfService(ctx);
    } catch (error) {
      await ctx.reply('Error loading terms. Use /terms command.');
    }
  });

  bot.action('privacy_policy', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await showPrivacyPolicy(ctx);
    } catch (error) {
      await ctx.reply('Error loading privacy policy. Use /privacy command.');
    }
  });

  // /joinchannel command
  bot.command('joinchannel', async (ctx) => {
    try {
      const message = `📢 **Join SURGE Announcements Channel**

Stay updated with the latest news, updates, and announcements from SURGE!

**Channel Benefits:**
• Latest trading signals
• Important updates
• Community announcements
• Exclusive content

Click the button below to join our channel:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📢 Join Channel', url: SURGE_ANNOUNCEMENTS_CHANNEL }
          ],
          [
            { text: '🔙 Main Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(message, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in joinchannel command:', error);
      await ctx.reply('Error joining channel. Please try again later.');
    }
  });
}

// Helper functions
async function showTermsOfService(ctx: Context) {
  const termsMessage = `📋 **Terms of Service**

**SURGE Bot Terms & Conditions**

**1. Service Description**
SURGE Bot provides AI-powered trading signals for educational purposes only. We do not provide financial advice.

**2. Subscription Terms**
• Subscriptions are non-refundable after 24 hours
• Access granted within 1 hour of payment verification
• Renewals offer 10% discount for existing users

**3. User Responsibilities**
• Provide accurate TradingView username
• Trade responsibly and manage risk
• Do not share account access

**4. Signal Disclaimer**
• Signals are for educational purposes
• Past performance doesn't guarantee future results
• Always do your own research (DYOR)

**5. Payment Terms**
• Payments accepted in SOL only
• Transactions are processed on Solana blockchain
• No chargebacks possible due to blockchain nature

**6. Privacy & Data**
• We store minimal user data
• No trading data is collected
• Telegram handles authentication

**7. Liability**
SURGE Bot is not liable for trading losses. Use signals at your own risk.

**Last Updated:** December 2024

For questions, contact: ${SUPPORT_EMAIL}`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🔒 Privacy Policy', callback_data: 'privacy_policy' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(termsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(termsMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
}

async function showPrivacyPolicy(ctx: Context) {
  const privacyMessage = `🔒 **Privacy Policy**

**SURGE Bot Privacy Policy**

**Information We Collect:**
• Telegram user ID and username
• TradingView username (provided by user)
• Subscription status and payment records
• Bot usage analytics

**How We Use Information:**
• Provide bot services and trading signals
• Process subscriptions and payments
• Send relevant updates and notifications
• Improve our services

**Information We Don't Collect:**
• Personal trading data
• Wallet private keys
• Sensitive financial information
• Location data

**Data Sharing:**
• We don't sell or share personal data
• Payment data secured via blockchain
• Anonymous usage statistics only

**Data Security:**
• Encrypted data storage
• Secure API communications
• Regular security audits
• No password storage required


**Cookies & Tracking:**
• No web cookies used
• Telegram handles authentication
• Anonymous bot analytics only

**Contact Us:**
For privacy questions: ${SUPPORT_EMAIL}

**Last Updated:** December 2024`;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '📋 Terms of Service', callback_data: 'terms_service' }
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'back_to_main' }
      ]
    ]
  };

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(privacyMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(privacyMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
} 


