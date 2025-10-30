export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  usdPrice?: number;
}

export interface SwapInfo {
  signature: string;
  timestamp: number;
  inputToken: {
    mint: string;
    symbol: string;
    name: string;
    amount: string;
    uiAmount: number;
    decimals: number;
    usdValue?: number;
  };
  outputToken: {
    mint: string;
    symbol: string;
    name: string;
    amount: string;
    uiAmount: number;
    decimals: number;
    usdValue?: number;
  };
  wallet: string;
  dex?: string;
}

export interface TokenPosition {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  trades: Trade[];
}

export interface Trade {
  signature: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
  usdValue?: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
}

export interface WalletPerformance {
  walletAddress: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnL: number;
  roi: number;
  positions: Map<string, TokenPosition>;
  trades: Trade[];
  startingBalance: number;
  currentBalance: number;
}

export interface JupiterTokenData {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  usdPrice?: number;
}

export interface ParsedInstruction {
  type: string;
  info: {
    source?: string;
    destination?: string;
    authority?: string;
    amount?: string;
    mint?: string;
  };
}

export interface TransactionMessage {
  signature: string;
  slot: number;
  transaction: {
    message: {
      instructions: any[];
      accountKeys: string[];
    };
    signatures: string[];
  };
  meta?: {
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: any[];
    postTokenBalances?: any[];
  };
}

export interface Config {
  rpcHttp: string;
  rpcWs: string;
  trackedWallets: string[];
  jupiterApiKey?: string;
  minSwapValueUsd: number;
  trackPerformance: boolean;
  showOnlyTokenSwaps: boolean;
}