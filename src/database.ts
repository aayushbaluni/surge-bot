import mongoose from 'mongoose';
import { logger } from './utils/logger';
import { MONGODB_URI } from './config/env';

export async function connectDatabase() {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(MONGODB_URI, options);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDatabase, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    logger.info('✅ Connected to MongoDB successfully');
    logger.info(`📊 Database: ${MONGODB_URI.includes('localhost') ? 'Local' : 'Remote'}`);
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    // Attempt to reconnect after 5 seconds
    setTimeout(connectDatabase, 5000);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  tvUsername: String,
  walletAddress: String,
  affiliateCode: { type: String, unique: true, index: true },
  subscription: {
    isActive: { type: Boolean, default: false },
    plan: String,
    startDate: Date,
    endDate: Date
  },
  affiliateStats: {
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    totalAffiliates: { type: Number, default: 0 },
    successfulAffiliates: { type: Number, default: 0 }
  },
  referredBy: { type: Number, index: true }
});

// Add indexes for common queries
userSchema.index({ userId: 1 });
userSchema.index({ 'subscription.isActive': 1 });
userSchema.index({ 'affiliateStats.totalEarnings': -1 });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true },
  txId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
  referralCode: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add compound index for transaction queries
transactionSchema.index({ userId: 1, status: 1 });

// Affiliate Reward Schema
const affiliateRewardSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  referredUserId: { type: Number, required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  paidAt: Date,
  paymentTxId: String
});

// Add compound index for affiliate reward queries
affiliateRewardSchema.index({ userId: 1, status: 1 });
affiliateRewardSchema.index({ referredUserId: 1 });

// Generate unique affiliate code
userSchema.pre('save', async function(next) {
  if (!this.affiliateCode) {
    let code;
    let isUnique = false;
    while (!isUnique) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingUser = await User.findOne({ affiliateCode: code });
      if (!existingUser) {
        isUnique = true;
      }
    }
    this.affiliateCode = code;
  }
  next();
});

// Create models
export const User = mongoose.model('User', userSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const AffiliateReward = mongoose.model('AffiliateReward', affiliateRewardSchema);

interface User {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  tvUsername?: string;
  walletAddress?: string;
  createdAt?: Date;
  lastActive?: Date;
  subscription?: {
    plan: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  affiliateCode?: string;
  affiliateStats?: {
    totalEarnings: number;
    pendingEarnings: number;
    totalAffiliates: number;
    successfulAffiliates: number;
  };
  referredBy?: number;
} 