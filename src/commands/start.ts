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
      // Set up bot commands
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'menu', description: 'Show main menu' },
        { command: 'terms', description: 'View terms of service' },
        { command: 'privacy', description: 'View privacy policy' },
        { command: 'about', description: 'Learn more about SURGE' }
      ]);

      // Send welcome image and message
      await ctx.replyWithPhoto(
        { source: './src/assets/surge.png' },
        {
          caption: `*Welcome to SURGE Trading Suite!* 🚀\n\nUnlock smarter trading with AI-powered signals, institutional tools, and real-time dashboards. Designed for all traders, from beginner to pro.`,
          parse_mode: 'Markdown'
        }
      );

      // Check for referral code
      const startPayload = ctx.message.text.split(' ')[1];
      let referredBy = null;

      if (startPayload) {
        logger.info(`Processing start payload: ${startPayload}`);
        const referrer = await User.findOne({ affiliateCode: startPayload });
        if (referrer) {
          referredBy = referrer.userId;
          logger.info(`User ${ctx.from.id} referred by ${referrer.userId} with code ${startPayload}`);
        } else {
          logger.info(`No referrer found for code: ${startPayload}`);
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

      const welcomeMessage = `Choose an option below to get started:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 Get Access Now', callback_data: 'view_plans' },
            { text: '❓ FAQ', callback_data: 'faq' }
          ],
          [
            { text: '🌐 Website', url: WEBSITE_URL },
            { text: 'ℹ️ About Us', callback_data: 'about_us' }
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

  // /about command
  bot.command('about', async (ctx) => {
    try {
      const aboutMessage = `*SURGE Trading Suite* 🚀

Unlock smarter trading with AI-powered signals, institutional tools, and real-time dashboards. Designed for all traders, from beginner to pro.

*SURGE AI MAX ALGO* 🤖
Your all-in-one trading assistant. Get clear buy/sell signals, AI price forecasts, and instant risk management—right on your chart.

*SURGE AITS* 📊
See the market like the big players. Institutional trend analysis, order block detection, and advanced support/resistance—made simple.

*SURGE PRO Oscillator* 📈
Spot momentum shifts before the crowd. This oscillator highlights overbought/oversold zones and trend reversals with precision.

*SURGE Momentum Scanner* 🔍
Scan the market for the strongest trends and momentum plays. Perfect for finding high-probability setups in any asset.

*Why Choose SURGE?* 💎
No more guesswork. Get actionable insights, automated trade plans, and professional-grade tools—all in one suite.

*Easy to Use* ✨
Plug into TradingView, follow the dashboard, and trade with confidence. No coding or complex setup required.

*Risk Management Built-In* 🛡️
Every signal comes with entry, stop loss, and take profit levels—so you always know your risk.

*For All Markets* 🌐
Works on crypto, forex, stocks, and more. One subscription, unlimited potential.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 Get Access Now', callback_data: 'view_plans' }
          ],
          [
            { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.reply(aboutMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in about command:', error);
      await ctx.reply('Error loading about us information. Please try again.');
    }
  });

  // Update the main menu keyboard to include About Us
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '📋 Get Access Now', callback_data: 'view_plans' },
        { text: '❓ FAQ', callback_data: 'faq' }
      ],
      [
        { text: '🌐 Website', url: WEBSITE_URL },
        { text: 'ℹ️ About Us', callback_data: 'about_us' }
      ],
      [
        { text: '🐦 Twitter', url: TWITTER_URL }
      ],
      [
        { text: '🤝 Affiliate Program', callback_data: 'affiliate_program' }
      ]
    ]
  };

  // Add handler for About Us button
  bot.action('about_us', async (ctx) => {
    try {
      const aboutMessage = `*SURGE Trading Suite* 🚀

Unlock smarter trading with AI-powered signals, institutional tools, and real-time dashboards. Designed for all traders, from beginner to pro.

*SURGE AI MAX ALGO* 🤖
Your all-in-one trading assistant. Get clear buy/sell signals, AI price forecasts, and instant risk management—right on your chart.

*SURGE AITS* 📊
See the market like the big players. Institutional trend analysis, order block detection, and advanced support/resistance—made simple.

*SURGE PRO Oscillator* 📈
Spot momentum shifts before the crowd. This oscillator highlights overbought/oversold zones and trend reversals with precision.

*SURGE Momentum Scanner* 🔍
Scan the market for the strongest trends and momentum plays. Perfect for finding high-probability setups in any asset.

*Why Choose SURGE?* 💎
No more guesswork. Get actionable insights, automated trade plans, and professional-grade tools—all in one suite.

*Easy to Use* ✨
Plug into TradingView, follow the dashboard, and trade with confidence. No coding or complex setup required.

*Risk Management Built-In* 🛡️
Every signal comes with entry, stop loss, and take profit levels—so you always know your risk.

*For All Markets* 🌐
Works on crypto, forex, stocks, and more. One subscription, unlimited potential.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📋 Get Access Now', callback_data: 'view_plans' }
          ],
          [
            { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(aboutMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Error in about_us action:', error);
      await ctx.answerCbQuery('Error loading about us information. Please try again.');
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
      const termsMessage = `📋 *Terms of Service*

*Last Updated: May 2025*

*1. AGREEMENT*
By using SURGE Trading Solutions LLC's services, you agree to these terms. If you disagree, you must discontinue use immediately.

*2. INTELLECTUAL PROPERTY*
All content, code, and trademarks are our property and protected by law. No unauthorized copying or distribution allowed.

*3. USER LICENSE*
You get a limited, non-transferable license for personal use. Any breach results in immediate termination.

*4. USER RESPONSIBILITIES*
You must:
• Be legally capable
• Not be a minor
• Not use automated means
• Use services legally
• Comply with all laws

*5. PAYMENT TERMS*
• We accept SOL, cards, PayPal
• Subscriptions auto-renew
• Lifetime plan = product lifetime
• No refunds (1-Day Trial available)

*6. CANCELLATION*
Cancel anytime via customer portal or email support@surgetrade.io

*7. PROHIBITED ACTIVITIES*
• No data scraping
• No reverse engineering
• No sharing access
• No security circumvention
• No automated usage

*8. RISK DISCLAIMER*
• Services provided "AS IS"
• Trading is high-risk
• Not financial advice
• Past performance ≠ future results

*9. LIABILITY*
We are not liable for any damages from your use of our services.

*10. TERMINATION*
We can terminate access for any reason without notice.

*11. GOVERNING LAW*
Laws of [Your Country/State] apply.

*12. CONTACT*
SURGE Trading Solutions LLC
Website: https://surgetrade.io
Email: support@surgetrade.io`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
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
      const privacyMessage = `🔒 *Privacy Policy*

*Last Updated: May 2025*

*INTRODUCTION*
This Privacy Policy outlines how SURGE Trading Solutions LLC ("we") handles your information when you use our website (https://surgetrade.io) and SURGE Trading Suite.

*1. INFORMATION WE COLLECT*

*Personal Information:*
• TradingView username (for access)
• Email address (for support/updates)
• Payment details (processed securely)

*Automatic Collection:*
• IP address & browser info
• Usage statistics
• Cookies for functionality

*2. HOW WE USE YOUR DATA*
• Provide & maintain services
• Process payments securely
• Send important updates
• Improve user experience
• Prevent fraud
• Marketing (with consent)

*3. DATA RETENTION*
We keep your data only as long as necessary for:
• Service provision
• Legal compliance
• Dispute resolution

*4. DATA SHARING*
We share data only with:
• Payment processors
• Analytics services
• Legal requirements

*5. YOUR RIGHTS*
You can:
• Access your data
• Request corrections
• Object to processing
• Request data deletion
• Export your data
• Withdraw consent

*6. COOKIES*
We use cookies for:
• Basic functionality
• Analytics
• User preferences

*7. CHILDREN'S PRIVACY*
• No services for under 18
• No collection from children
• Contact us if child data found

*8. POLICY UPDATES*
We may update this policy. Check the "Last Updated" date for changes.

*CONTACT US*
SURGE Trading Solutions LLC
Website: https://surgetrade.io
Email: support@surgetrade.io`;

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

*Last Updated: May 2025*

### 1. AGREEMENT TO TERMS

These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and *SURGE Trading Solutions LLC* ("we," "us," or "our"), concerning your access to and use of the ⁠ https://surgetrade.io ⁠ website as well as the trading indicators, scripts, software, and any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Services").

You agree that by accessing the Services, you have read, understood, and agree to be bound by all of these Terms of Service. *IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF SERVICE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.*

### 2. INTELLECTUAL PROPERTY RIGHTS

Unless otherwise indicated, the Services are our proprietary property and all source code, databases, functionality, software, website designs, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of the United States, foreign jurisdictions, and international conventions.

The Content and the Marks are provided on the Site "AS IS" for your information and personal use only. Except as expressly provided in these Terms of Service, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.

### 3. USER LICENSE

Provided that you are eligible to use the Services, you are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Services and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use. We reserve all rights not expressly granted to you in and to the Services, the Content and the Marks. Any breach of these Terms of Service will result in the immediate termination of your license without notice.

### 4. USER REPRESENTATIONS

By using the Services, you represent and warrant that: 
(1) you have the legal capacity and you agree to comply with these Terms of Service; 
(2) you are not a minor in the jurisdiction in which you reside; 
(3) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise; 
(4) you will not use the Services for any illegal or unauthorized purpose; 
(5) your use of the Services will not violate any applicable law or regulation.

### 5. FEES AND PAYMENT

We accept payment via credit/debit card, PayPal, and select cryptocurrencies (SOL). You may be required to purchase or pay a fee to access some of our services. You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Site. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed.

*   *Subscriptions:* If you purchase a subscription, you will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or yearly basis. Your subscription will automatically renew at the end of each Billing Cycle unless you cancel it through your customer portal or by contacting us at ⁠ support@surgetrade.io ⁠.
*   *Lifetime Plan:* A "Lifetime" plan refers to the lifetime of the SURGE Trading Suite product line. It entitles you to access for as long as the product is actively maintained and sold by SURGE Trading Solutions LLC.
*   *Refunds:* Due to the digital nature of our product and the immediate access provided, all fees are non-refundable. We provide a 1-Day Trial for you to evaluate the product before purchase.

### 6. CANCELLATION

You can cancel your subscription at any time. Your cancellation will take effect at the end of the current paid term. If you are unsatisfied with our services, please email us at ⁠ support@surgetrade.io ⁠.

### 7. PROHIBITED ACTIVITIES

You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. As a user of the Services, you agree not to:
*   Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.
*   Decompile, reverse engineer, disassemble, or otherwise attempt to derive the source code for the indicators.
*   Share, lease, sell, or redistribute your access to our Services.
*   Circumvent, disable, or otherwise interfere with security-related features of the Services.
*   Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.

### 8. DISCLAIMER AND ACKNOWLEDGEMENT OF RISK

THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

TRADING IN FINANCIAL MARKETS IS A HIGH-RISK ACTIVITY AND IS NOT SUITABLE FOR ALL INVESTORS. BEFORE DECIDING TO TRADE, YOU SHOULD CAREFULLY CONSIDER YOUR INVESTMENT OBJECTIVES, LEVEL OF EXPERIENCE, AND RISK APPETITE.

THE CONTENT AND SIGNALS PROVIDED BY THE SERVICES ARE FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY AND DO NOT CONSTITUTE FINANCIAL OR INVESTMENT ADVICE. PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.

### 9. LIMITATION OF LIABILITY

IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

### 10. TERM AND TERMINATION

These Terms of Service shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS OF SERVICE, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE TERMS OF SERVICE OR OF ANY APPLICABLE LAW OR REGULATION.

### 11. GOVERNING LAW AND DISPUTE RESOLUTION

These Terms shall be governed by and defined following the laws of [Your Country/State]. SURGE Trading Solutions LLC and yourself irrevocably consent that the courts of [Your Country/State] shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.

### 12. MISCELLANEOUS

These Terms of Service and any policies or operating rules posted by us on the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Terms of Service shall not operate as a waiver of such right or provision.

### 13. CONTACT US

In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:

*SURGE Trading Solutions LLC*
*Website:* ⁠ https://surgetrade.io ⁠
*Email:* ⁠ support@surgetrade.io ⁠`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
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


