import { Context as TelegrafContext, session as TelegrafSession } from 'telegraf';
import { SOLANA_WALLET_ADDRESS } from './config/env';

export interface SessionData {
  step: 'welcome' | 'plan_selection' | 'plan_details' | 'payment' | 'txid' | 'tv_username' | 'complete' | 'awaiting_txid' | 'awaiting_tv_username' | 'set_wallet' | 'subscription';
  userId?: number;
  selectedPlan?: {
    type: 'trial' | 'monthly' | 'six_month' | 'yearly' | 'lifetime';
    price: number;
    duration: number;
    name: string;
  };
  paymentDetails?: {
    amount: number;
    walletAddress: string;
    txId?: string;
  };
  tvUsername?: string;
  dashboardToken?: string;
  messageId?: number;
  isChannelMember?: boolean;
  lastActivity?: number;
}

export interface Context extends TelegrafContext {
  session: SessionData;
}

export interface Plan {
  type: 'trial' | 'monthly' | 'six_month' | 'yearly' | 'lifetime';
  name: string;
  price: number;
  duration: number;
  features: string[];
  discountText?: string;
  badge?: string;
}

export const PLANS: Record<string, Plan> = {
  trial: {
    type: 'trial',
    name: 'Trial Plan',
    price: 0.1,
    duration: 1, // 1 day
    features: [
      'All SURGE AI-driven buy/sell signals',
      'Multi-tier TP & adaptive SL',
      'Custom oscillators & volatility alerts',
      'Private Telegram group access',
      '24/7 support'
    ],
    badge: '🎁 NEW'
  },
  monthly: {
    type: 'monthly',
    name: 'Monthly Plan',
    price: 1,
    duration: 30,
    features: [
      'All SURGE AI-driven buy/sell signals',
      'Multi-tier TP & adaptive SL',
      'Custom oscillators & volatility alerts',
      'Private Telegram group access',
      '24/7 support'
    ],
    discountText: 'Save 50%',
  },
  six_month: {
    type: 'six_month',
    name: '6-Month Plan',
    price: 4.5,
    duration: 180,
    features: [
      'All SURGE AI-driven buy/sell signals',
      'Multi-tier TP & adaptive SL',
      'Custom oscillators & volatility alerts',
      'Private Telegram group access',
      'Elite group access',
      'Advanced Network channel',
      '24/7 support'
    ],
    discountText: 'Save 25%',
    badge: '🔥 POPULAR'
  },
  yearly: {
    type: 'yearly',
    name: 'Yearly Plan',
    price: 8,
    duration: 365,
    features: [
      'All SURGE AI-driven buy/sell signals',
      'Multi-tier TP & adaptive SL',
      'Custom oscillators & volatility alerts',
      'Private Telegram group access',
      'Elite group access',
      'Advanced Network channel',
      '10% renewal discount',
      '24/7 priority support'
    ],
    discountText: 'Save 60%',
    badge: '⭐ BEST VALUE'
  },
  lifetime: {
    type: 'lifetime',
    name: 'Lifetime Plan',
    price: 10,
    duration: 36500, // 100 years
    features: [
      'All SURGE AI-driven buy/sell signals',
      'Multi-tier TP & adaptive SL',
      'Custom oscillators & volatility alerts',
      'Private Telegram group access',
      'Elite group access',
      'Advanced Network channel',
      'Lifetime updates',
      'VIP community access',
      'Priority support'
    ],
    discountText: 'Save 75%',
  }
};

// Export the Solana wallet address from environment
export { SOLANA_WALLET_ADDRESS };

export interface UserSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number;
  timestamp: Date;
  status: 'active' | 'closed' | 'cancelled';
}

export interface UserDashboard {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  successfulTrades: number;
  totalPnL: number;
  currentDrawdown: number;
} 