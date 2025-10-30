import { WalletPerformance, Trade, TokenPosition, SwapInfo } from '../types';
import { jupiterService } from './jupiter';

const NATIVE_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

export class PerformanceTracker {
  private performances: Map<string, WalletPerformance> = new Map();

  /**
   * Initialize tracking for a wallet
   */
  initializeWallet(walletAddress: string): void {
    if (!this.performances.has(walletAddress)) {
      this.performances.set(walletAddress, {
        walletAddress,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalRealizedPnL: 0,
        totalUnrealizedPnL: 0,
        totalPnL: 0,
        roi: 0,
        positions: new Map(),
        trades: [],
        startingBalance: 0,
        currentBalance: 0
      });
    }
  }

  /**
   * Process a swap and update performance metrics
   */
  async processSwap(swap: SwapInfo): Promise<void> {
    this.initializeWallet(swap.wallet);
    const performance = this.performances.get(swap.wallet)!;

    // Determine if we're buying or selling a position
    const inputIsBaseToken = this.isBaseToken(swap.inputToken.mint);
    const outputIsBaseToken = this.isBaseToken(swap.outputToken.mint);

    // Skip base-to-base conversions completely (SOL→USDC, USDC→USDT, etc.)
    if (inputIsBaseToken && outputIsBaseToken) {
      return; // Don't track these at all
    }

    if (inputIsBaseToken && !outputIsBaseToken) {
      // BUY: Spending base token (SOL/USDC/USDT) to acquire another token
      await this.processBuy(swap, performance);
    } else if (!inputIsBaseToken && outputIsBaseToken) {
      // SELL: Disposing of a token to get base token (SOL/USDC/USDT)
      await this.processSell(swap, performance);
    } else if (!inputIsBaseToken && !outputIsBaseToken) {
      // Token → Token swap
      await this.processTokenToTokenSwap(swap, performance);
    }

    this.updateMetrics(performance);
  }

  /**
   * Check if a token is a "base" token (SOL, USDC, or USDT)
   */
  private isBaseToken(mint: string): boolean {
    return mint === NATIVE_MINT || mint === USDC_MINT || mint === USDT_MINT;
  }

  /**
   * Process a buy trade (Base Token → Target Token)
   */
  private async processBuy(swap: SwapInfo, performance: WalletPerformance): Promise<void> {
    const tokenMint = swap.outputToken.mint;
    const tokenSymbol = swap.outputToken.symbol;
    const tokenName = swap.outputToken.name;
    const tokenAmount = swap.outputToken.uiAmount;
    const costInUSD = swap.inputToken.usdValue || 0;
    const pricePerToken = tokenAmount > 0 ? costInUSD / tokenAmount : 0;

    const trade: Trade = {
      signature: swap.signature,
      timestamp: swap.timestamp,
      type: 'BUY',
      tokenMint,
      tokenSymbol,
      tokenAmount,
      solAmount: 0,
      pricePerToken,
      usdValue: costInUSD
    };

    performance.trades.push(trade);
    performance.totalTrades++;

    // Update or create position
    let position = performance.positions.get(tokenMint);
    if (!position) {
      position = {
        mint: tokenMint,
        symbol: tokenSymbol,
        name: tokenName,
        balance: 0,
        avgBuyPrice: 0,
        totalInvested: 0,
        currentValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        trades: []
      };
      performance.positions.set(tokenMint, position);
    }

    // Update average buy price (weighted average)
    const previousTotalCost = position.totalInvested;
    const previousBalance = position.balance;
    const newTotalCost = previousTotalCost + costInUSD;
    const newTotalBalance = previousBalance + tokenAmount;
    
    position.avgBuyPrice = newTotalBalance > 0 ? newTotalCost / newTotalBalance : 0;
    position.balance = newTotalBalance;
    position.totalInvested = newTotalCost;
    position.trades.push(trade);

    // Update current value
    const currentPrice = swap.outputToken.usdValue && tokenAmount > 0 
      ? (swap.outputToken.usdValue / tokenAmount) 
      : undefined;
    
    if (currentPrice) {
      position.currentValue = position.balance * currentPrice;
      position.unrealizedPnL = position.currentValue - position.totalInvested;
      position.unrealizedPnLPercent = position.totalInvested > 0 
        ? (position.unrealizedPnL / position.totalInvested) * 100 
        : 0;
    }
  }

  /**
   * Process a sell trade (Target Token → Base Token)
   */
  private async processSell(swap: SwapInfo, performance: WalletPerformance): Promise<void> {
    const tokenMint = swap.inputToken.mint;
    const tokenSymbol = swap.inputToken.symbol;
    const tokenAmount = swap.inputToken.uiAmount;
    const receivedInUSD = swap.outputToken.usdValue || 0;
    const pricePerToken = tokenAmount > 0 ? receivedInUSD / tokenAmount : 0;

    const position = performance.positions.get(tokenMint);
    
    // If we don't have a position, don't track this trade at all
    if (!position || position.balance <= 0) {
      console.log(`⚠️  Selling ${tokenSymbol} but no position found. Might have been bought before tracking started.`);
      return; // Exit early - don't track this trade
    }

    // Check if selling more than we have tracked
    const amountToCalculate = Math.min(tokenAmount, position.balance);
    const isPartialPosition = tokenAmount > position.balance;
    
    if (isPartialPosition) {
      console.log(`⚠️  Selling ${this.formatNumber(tokenAmount)} ${tokenSymbol} but only tracking ${this.formatNumber(position.balance)}. P&L calculated on tracked amount only.`);
    }

    // Calculate realized P&L based on cost basis (only for tracked amount)
    const costBasis = position.avgBuyPrice * amountToCalculate;
    const proportionalReceived = (amountToCalculate / tokenAmount) * receivedInUSD;
    const realizedPnL = proportionalReceived - costBasis;
    const realizedPnLPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;

    // Track winning/losing trades (only if P&L is meaningful)
    if (Math.abs(realizedPnL) > 0.01) {
      if (realizedPnL > 0) {
        performance.winningTrades++;
      } else {
        performance.losingTrades++;
      }
    }

    performance.totalRealizedPnL += realizedPnL;

    // Update position - remove the amount we actually tracked
    position.balance -= amountToCalculate;
    
    // Adjust total invested proportionally
    const percentageSold = amountToCalculate / (position.balance + amountToCalculate);
    position.totalInvested -= (position.totalInvested * percentageSold);

    if (position.balance <= 0.001) {
      // Position closed
      performance.positions.delete(tokenMint);
    } else {
      // Update current value for remaining position
      const currentPrice = await this.getCurrentTokenPriceUSD(tokenMint);
      if (currentPrice) {
        position.currentValue = position.balance * currentPrice;
        position.unrealizedPnL = position.currentValue - position.totalInvested;
        position.unrealizedPnLPercent = position.totalInvested > 0
          ? (position.unrealizedPnL / position.totalInvested) * 100
          : 0;
      }
    }

    const trade: Trade = {
      signature: swap.signature,
      timestamp: swap.timestamp,
      type: 'SELL',
      tokenMint,
      tokenSymbol,
      tokenAmount: amountToCalculate, // Store only tracked amount
      solAmount: 0,
      pricePerToken,
      usdValue: proportionalReceived, // Store only proportional USD value
      realizedPnL,
      realizedPnLPercent
    };

    performance.trades.push(trade);
    performance.totalTrades++;
    position.trades.push(trade);
  }

  /**
   * Format number for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }

  /**
   * Process token-to-token swaps (not base tokens)
   */
  private async processTokenToTokenSwap(swap: SwapInfo, performance: WalletPerformance): Promise<void> {
    const inputMint = swap.inputToken.mint;
    const outputMint = swap.outputToken.mint;
    
    // Check if we have a position in the input token
    const inputPosition = performance.positions.get(inputMint);
    
    if (inputPosition && inputPosition.balance > 0) {
      // We're selling a token we own - calculate P&L
      const tokenAmount = swap.inputToken.uiAmount;
      const receivedValue = swap.outputToken.usdValue || 0;
      const costBasis = inputPosition.avgBuyPrice * tokenAmount;
      const realizedPnL = receivedValue - costBasis;
      const realizedPnLPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;
      
      // Track win/loss
      if (Math.abs(realizedPnL) > 0.01) {
        if (realizedPnL > 0) {
          performance.winningTrades++;
        } else {
          performance.losingTrades++;
        }
      }
      
      performance.totalRealizedPnL += realizedPnL;
      
      // Update input position
      inputPosition.balance -= tokenAmount;
      const percentageSold = tokenAmount / (inputPosition.balance + tokenAmount);
      inputPosition.totalInvested -= (inputPosition.totalInvested * percentageSold);
      
      if (inputPosition.balance <= 0.001) {
        performance.positions.delete(inputMint);
      }
    }
    
    // Now handle the output token as a buy
    const outputSymbol = swap.outputToken.symbol;
    const outputName = swap.outputToken.name;
    const outputAmount = swap.outputToken.uiAmount;
    const outputValue = swap.outputToken.usdValue || swap.inputToken.usdValue || 0;
    
    let outputPosition = performance.positions.get(outputMint);
    if (!outputPosition) {
      outputPosition = {
        mint: outputMint,
        symbol: outputSymbol,
        name: outputName,
        balance: 0,
        avgBuyPrice: 0,
        totalInvested: 0,
        currentValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        trades: []
      };
      performance.positions.set(outputMint, outputPosition);
    }
    
    // Update average buy price
    const previousTotalCost = outputPosition.totalInvested;
    const previousBalance = outputPosition.balance;
    const newTotalCost = previousTotalCost + outputValue;
    const newTotalBalance = previousBalance + outputAmount;
    
    outputPosition.avgBuyPrice = newTotalBalance > 0 ? newTotalCost / newTotalBalance : 0;
    outputPosition.balance = newTotalBalance;
    outputPosition.totalInvested = newTotalCost;
    
    const trade: Trade = {
      signature: swap.signature,
      timestamp: swap.timestamp,
      type: 'BUY',
      tokenMint: outputMint,
      tokenSymbol: outputSymbol,
      tokenAmount: outputAmount,
      solAmount: 0,
      pricePerToken: outputAmount > 0 ? outputValue / outputAmount : 0,
      usdValue: outputValue
    };
    
    performance.trades.push(trade);
    performance.totalTrades++;
    outputPosition.trades.push(trade);
  }

  /**
   * Get current token price in USD
   */
  private async getCurrentTokenPriceUSD(tokenMint: string): Promise<number | undefined> {
    try {
      const tokenPrice = await jupiterService.getTokenPrice(tokenMint);
      return tokenPrice;
    } catch (error) {
      // Silent fail
    }
    return undefined;
  }

  /**
   * Update overall performance metrics
   */
  private updateMetrics(performance: WalletPerformance): void {
    // Calculate unrealized P&L from open positions
    let totalUnrealizedPnL = 0;
    let totalInvested = 0;
    
    for (const position of performance.positions.values()) {
      totalUnrealizedPnL += position.unrealizedPnL;
      totalInvested += position.totalInvested;
    }
    
    performance.totalUnrealizedPnL = totalUnrealizedPnL;

    // Calculate total P&L
    performance.totalPnL = performance.totalRealizedPnL + performance.totalUnrealizedPnL;

    // Calculate win rate (only from closed trades that had meaningful P&L)
    const totalClosedTrades = performance.winningTrades + performance.losingTrades;
    performance.winRate = totalClosedTrades > 0 
      ? (performance.winningTrades / totalClosedTrades) * 100 
      : 0;

    // Calculate ROI - Fixed calculation
    // ROI = Total P&L / Total Capital Invested
    const totalCapital = totalInvested + Math.abs(performance.totalRealizedPnL);
    
    performance.roi = totalCapital > 0 
      ? (performance.totalPnL / totalCapital) * 100 
      : 0;
  }

  /**
   * Get performance for a wallet
   */
  getPerformance(walletAddress: string): WalletPerformance | undefined {
    return this.performances.get(walletAddress);
  }

  /**
   * Get all performances
   */
  getAllPerformances(): Map<string, WalletPerformance> {
    return this.performances;
  }

  /**
   * Get top positions by unrealized P&L
   */
  getTopPositions(walletAddress: string, limit: number = 5): TokenPosition[] {
    const performance = this.performances.get(walletAddress);
    if (!performance) return [];

    return Array.from(performance.positions.values())
      .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
      .slice(0, limit);
  }

  /**
   * Get recent trades
   */
  getRecentTrades(walletAddress: string, limit: number = 10): Trade[] {
    const performance = this.performances.get(walletAddress);
    if (!performance) return [];

    return performance.trades.slice(-limit).reverse();
  }
}

export const performanceTracker = new PerformanceTracker();