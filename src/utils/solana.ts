import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from './logger';
import { QUICKNODE_RPC_URL } from '../config/env';

const connection = new Connection(QUICKNODE_RPC_URL, 'confirmed');

export async function verifyTransaction(txId: string, expectedAmount: number, walletAddress: string): Promise<boolean> {
  try {
    const transaction = await connection.getTransaction(txId);
    
    if (!transaction) {
      logger.warn(`Transaction not found: ${txId}`);
      return false;
    }

    // Basic verification - in production you would do more thorough checks
    // Check if transaction is confirmed
    if (!transaction.meta || transaction.meta.err) {
      logger.warn(`Transaction failed or unconfirmed: ${txId}`);
      return false;
    }

    // For now, return true for any valid transaction
    // In production, you would verify:
    // 1. Transaction sends to your wallet address
    // 2. Amount matches expected amount
    // 3. Transaction is recent enough
    return true;

  } catch (error) {
    logger.error('Error verifying Solana transaction:', error);
    return false;
  }
}

export async function getAccountBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error('Error getting account balance:', error);
    return 0;
  }
}

export { LAMPORTS_PER_SOL, PublicKey }; 