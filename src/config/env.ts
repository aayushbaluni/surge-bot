import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Environment variable interface
interface Environment {
  // Bot Configuration
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  CHANNEL_USERNAME: string;
  
  // Database Configuration
  MONGODB_URI: string;
  
  // Solana Configuration
  SOLANA_WALLET_ADDRESS: string;
  QUICKNODE_RPC_URL: string;
  
  // External Services
  COINGECKO_API_KEY?: string;
  NEWS_API_KEY?: string;
  
  // Support & Links
  SUPPORT_EMAIL: string;
  WEBSITE_URL: string;
  TWITTER_URL: string;
  TELEGRAM_CHANNEL: string;
  SURGE_ANNOUNCEMENTS_CHANNEL: string;
  
  // Private Group Links
  PRIVATE_GROUP_LINK: string;
  ELITE_GROUP_LINK: string;
  ADVANCED_NETWORK_LINK: string;
  
  // Optional Configuration
  NODE_ENV: string;
  PORT: string;
  LOG_LEVEL: string;
}

// Default environment values
const defaultValues: Partial<Environment> = {
  MONGODB_URI: 'mongodb://localhost:27017/surgebot',
  SOLANA_WALLET_ADDRESS: 'HFSjX2pJxVzETcrCqX4K8mMvuRjDvJWnCXaSURGEsolAddress',
  QUICKNODE_RPC_URL: 'https://ancient-fittest-field.solana-mainnet.quiknode.pro/52870c0fa2aaa478e5e8846f961685fa4eafbe02/',
  SUPPORT_EMAIL: 'support@surge-ai.com',
  WEBSITE_URL: 'https://surge-ai.com',
  TWITTER_URL: 'https://twitter.com/SURGE_AI',
  TELEGRAM_CHANNEL: 'https://t.me/surge_announcements',
  SURGE_ANNOUNCEMENTS_CHANNEL: 'https://t.me/surge_announcements',
  PRIVATE_GROUP_LINK: 'https://t.me/+SURGEPrivateGroup',
  ELITE_GROUP_LINK: 'https://t.me/+SURGEEliteGroup',
  ADVANCED_NETWORK_LINK: 'https://t.me/+SURGEAdvancedNetwork',
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info'
};

// Required environment variables (no defaults)
const requiredEnvVars: (keyof Environment)[] = [
  'BOT_TOKEN',
  'ADMIN_CHAT_ID',
  'CHANNEL_USERNAME'
];

// Function to validate and load environment variables
function loadEnvironment(): Environment {
  const env: Partial<Environment> = {};
  
  // Load all possible environment variables
  const envKeys: (keyof Environment)[] = [
    'BOT_TOKEN',
    'ADMIN_CHAT_ID', 
    'CHANNEL_USERNAME',
    'MONGODB_URI',
    'SOLANA_WALLET_ADDRESS',
    'QUICKNODE_RPC_URL',
    'COINGECKO_API_KEY',
    'NEWS_API_KEY',
    'SUPPORT_EMAIL',
    'WEBSITE_URL',
    'TWITTER_URL',
    'TELEGRAM_CHANNEL',
    'SURGE_ANNOUNCEMENTS_CHANNEL',
    'PRIVATE_GROUP_LINK',
    'ELITE_GROUP_LINK',
    'ADVANCED_NETWORK_LINK',
    'NODE_ENV',
    'PORT',
    'LOG_LEVEL'
  ];

  // Load environment variables with defaults
  envKeys.forEach(key => {
    const value = process.env[key] || defaultValues[key];
    if (value) {
      env[key] = value;
    }
  });

  // Validate required environment variables
  const missing = requiredEnvVars.filter(key => !env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please set the following environment variables:');
    missing.forEach(varName => {
      console.error(`  ${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Validate BOT_TOKEN format
  if (env.BOT_TOKEN && !env.BOT_TOKEN.includes(':')) {
    console.error('❌ Invalid BOT_TOKEN format. BOT_TOKEN should contain ":" (e.g., 123456789:ABC-DEF...)');
    process.exit(1);
  }

  // Validate ADMIN_CHAT_ID format (should be a number)
  if (env.ADMIN_CHAT_ID && isNaN(Number(env.ADMIN_CHAT_ID))) {
    console.error('❌ Invalid ADMIN_CHAT_ID format. ADMIN_CHAT_ID should be a number');
    process.exit(1);
  }

  // Validate Solana wallet address format (basic check)
  if (env.SOLANA_WALLET_ADDRESS && env.SOLANA_WALLET_ADDRESS.length < 32) {
    console.warn('⚠️  SOLANA_WALLET_ADDRESS seems too short. Please verify it\'s a valid Solana address');
  }

  console.log('✅ Environment variables loaded successfully');
  console.log('📊 Configuration summary:', {
    nodeEnv: env.NODE_ENV,
    hasBotToken: !!env.BOT_TOKEN,
    hasAdminChatId: !!env.ADMIN_CHAT_ID,
    hasChannelUsername: !!env.CHANNEL_USERNAME,
    hasMongoUri: !!env.MONGODB_URI,
    hasSolanaWallet: !!env.SOLANA_WALLET_ADDRESS,
    hasQuickNodeRPC: !!env.QUICKNODE_RPC_URL,
    hasCoingeckoKey: !!env.COINGECKO_API_KEY,
    hasNewsKey: !!env.NEWS_API_KEY
  });

  return env as Environment;
}

// Load and export environment
export const ENV = loadEnvironment();

// Export individual environment variables for convenience
export const {
  BOT_TOKEN,
  ADMIN_CHAT_ID,
  CHANNEL_USERNAME,
  MONGODB_URI,
  SOLANA_WALLET_ADDRESS,
  QUICKNODE_RPC_URL,
  COINGECKO_API_KEY,
  NEWS_API_KEY,
  SUPPORT_EMAIL,
  WEBSITE_URL,
  TWITTER_URL,
  TELEGRAM_CHANNEL,
  SURGE_ANNOUNCEMENTS_CHANNEL,
  PRIVATE_GROUP_LINK,
  ELITE_GROUP_LINK,
  ADVANCED_NETWORK_LINK,
  NODE_ENV,
  PORT,
  LOG_LEVEL
} = ENV;

// Utility function to check if we're in production
export const isProduction = () => NODE_ENV === 'production';
export const isDevelopment = () => NODE_ENV === 'development';

// Export environment validation function
export const validateEnvironment = () => {
  return loadEnvironment();
}; 