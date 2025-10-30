import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

export const config: Config = {
  rpcHttp: process.env.SOLANA_RPC_HTTP || 'https://api.mainnet-beta.solana.com',
  rpcWs: process.env.SOLANA_RPC_WS || 'wss://api.mainnet-beta.solana.com',
  trackedWallets: process.env.TRACKED_WALLETS?.split(',').map(w => w.trim()) || [],
  jupiterApiKey: process.env.JUPITER_API_KEY,
  minSwapValueUsd: parseFloat(process.env.MIN_SWAP_VALUE_USD || '1'),
};

export function validateConfig(): void {
  if (config.trackedWallets.length === 0) {
    console.error('❌ Error: No wallets to track. Set TRACKED_WALLETS in .env');
    process.exit(1);
  }

  if (!config.rpcHttp || !config.rpcWs) {
    console.error('❌ Error: RPC endpoints not configured in .env');
    process.exit(1);
  }

  console.log('✅ Configuration validated');
  console.log(`📊 Tracking ${config.trackedWallets.length} wallet(s)`);
  console.log(`💵 Min swap value filter: $${config.minSwapValueUsd}`);
}