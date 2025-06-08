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
  userId: { type: Number, required: true, unique: true, index: true },
  username: { type: String, index: true },
  firstName: String,
  lastName: String,
  tvUsername: { type: String, index: true },
  lastActive: { type: Date, default: Date.now },
  subscription: {
    plan: { type: String, enum: ['trial', 'monthly', 'yearly', 'lifetime'] },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: false }
  },
  payment: {
    amount: Number,
    txId: { type: String, index: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'] },
    date: Date
  },
  dashboardToken: { type: String, index: true },
  referralCode: { type: String, unique: true, index: true },
  referredBy: { type: String, index: true },
  referralStats: {
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 }
  },
  walletAddress: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add compound indexes for common queries
userSchema.index({ 'subscription.isActive': 1, 'subscription.endDate': 1 });
userSchema.index({ 'referralStats.totalEarnings': -1 });

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

// Referral Reward Schema
const referralRewardSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  referralCode: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  walletAddress: String,
  paymentTxId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add compound index for referral reward queries
referralRewardSchema.index({ userId: 1, status: 1 });

// Generate unique referral code
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generateCode();
      const existingUser = await User.findOne({ referralCode: code });
      if (!existingUser) {
        isUnique = true;
      }
    }
    this.referralCode = code;
  }
  next();
});

// Create models
export const User = mongoose.model('User', userSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const ReferralReward = mongoose.model('ReferralReward', referralRewardSchema); 