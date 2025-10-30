import chalk from 'chalk';
import { SwapInfo, WalletPerformance, TokenPosition, Trade } from '../types';
import { fileLogger } from './fileLogger';

export class Logger {
  /**
   * Log a swap transaction with beautiful formatting
   */
  static logSwap(swap: SwapInfo): void {
    // Detect DEX type for display
    const dexType = this.detectDEXFromTokens(swap);
    
    console.log('\n' + chalk.cyan('═'.repeat(80)));
    console.log(chalk.bold.green(`🔄 TOKEN SWAP DETECTED ${dexType ? `- ${dexType}` : ''}`));
    console.log(chalk.cyan('═'.repeat(80)));
    
    // Wallet info
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(swap.wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date(swap.timestamp).toLocaleString()));
    
    // Input token
    console.log('\n' + chalk.bold.red('📤 SOLD:'));
    console.log(
      chalk.white('  Token:'),
      chalk.bold(`${swap.inputToken.symbol} (${swap.inputToken.name})`)
    );
    console.log(
      chalk.white('  Amount:'),
      chalk.bold.red(`${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`)
    );
    if (swap.inputToken.usdValue) {
      console.log(
        chalk.white('  Value:'),
        chalk.bold.red(`$${this.formatNumber(swap.inputToken.usdValue)}`)
      );
    }
    console.log(
      chalk.white('  Mint:'),
      chalk.gray(this.truncateAddress(swap.inputToken.mint))
    );

    // Output token
    console.log('\n' + chalk.bold.green('📥 BOUGHT:'));
    console.log(
      chalk.white('  Token:'),
      chalk.bold(`${swap.outputToken.symbol} (${swap.outputToken.name})`)
    );
    console.log(
      chalk.white('  Amount:'),
      chalk.bold.green(`${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`)
    );
    if (swap.outputToken.usdValue) {
      console.log(
        chalk.white('  Value:'),
        chalk.bold.green(`$${this.formatNumber(swap.outputToken.usdValue)}`)
      );
    }
    console.log(
      chalk.white('  Mint:'),
      chalk.gray(this.truncateAddress(swap.outputToken.mint))
    );

    // Transaction link
    console.log('\n' + chalk.bold('🔗 Transaction:'));
    console.log(chalk.blue.underline(`  https://solscan.io/tx/${swap.signature}`));
    
    console.log(chalk.cyan('═'.repeat(80)) + '\n');
  }

  /**
   * Log any transaction (transfers, etc)
   */
  static logTransaction(signature: string, wallet: string, tx: any): void {
    const solTransferred = tx.meta?.postBalances && tx.meta?.preBalances
      ? Math.abs((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9)
      : 0;

    console.log('\n' + chalk.gray('─'.repeat(80)));
    console.log(chalk.bold.blue('📋 TRANSACTION DETECTED'));
    console.log(chalk.gray('─'.repeat(80)));
    
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date().toLocaleString()));
    console.log(chalk.bold('📊 Type:'), chalk.white('General Transaction'));
    
    if (solTransferred > 0) {
      console.log(chalk.bold('💰 SOL Moved:'), chalk.cyan(`${solTransferred.toFixed(4)} SOL`));
    }
    
    console.log(chalk.bold('🔗 Link:'), chalk.blue.underline(`https://solscan.io/tx/${signature}`));
    console.log(chalk.gray('─'.repeat(80)) + '\n');
  }

  /**
   * Log startup information
   */
  static logStartup(wallets: string[]): void {
    console.clear();
    console.log('\n' + chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('        🚀 SOLANA WALLET TRACKER V2 - ALL TOKEN EDITION 🚀           ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.bold.green('📊 Status:'), chalk.white('ACTIVE'));
    console.log(chalk.bold.yellow('👛 Tracking Wallets:'));
    wallets.forEach((wallet, index) => {
      console.log(chalk.white(`   ${index + 1}. ${this.truncateAddress(wallet)}`));
    });
    console.log(chalk.bold.cyan('🎯 Tracking Mode:'), chalk.white('ALL TOKEN SWAPS'));
    console.log(chalk.gray('\n⏳ Waiting for transactions...\n'));
  }

  /**
   * Log errors
   */
  static error(message: string, error?: any): void {
    console.error(chalk.bold.red('❌ ERROR:'), chalk.white(message));
    if (error) {
      console.error(chalk.gray(error.message || error));
    }
  }

  /**
   * Log info messages
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ️ '), chalk.white(message));
  }

  /**
   * Log success messages
   */
  static success(message: string): void {
    console.log(chalk.green('✅'), chalk.white(message));
  }

  /**
   * Log warnings
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠️ '), chalk.white(message));
  }

  /**
   * Truncate long addresses for display
   */
  private static truncateAddress(address: string, chars = 8): string {
    if (address.length <= chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Format numbers with thousand separators
   */
  private static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    if (num < 0.01 && num > 0) {
      return num.toExponential(2);
    }
    return num.toFixed(4);
  }

  /**
   * Detect DEX type from swap info
   */
  private static detectDEXFromTokens(swap: SwapInfo): string {
    // Add more DEX detection logic as needed
    return '';
  }

  /**
   * Log performance dashboard
   */
  static logPerformance(performance: WalletPerformance): void {
    console.log('\n' + chalk.magenta('═'.repeat(80)));
    console.log(chalk.bold.magenta('📊 WALLET PERFORMANCE DASHBOARD'));
    console.log(chalk.magenta('═'.repeat(80)));
    
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(performance.walletAddress)));
    console.log();
    
    // Overall Stats
    console.log(chalk.bold.cyan('📈 OVERALL STATS'));
    console.log(chalk.white('  Total Trades:'), chalk.bold(performance.totalTrades));
    
    const totalClosedTrades = performance.winningTrades + performance.losingTrades;
    if (totalClosedTrades > 0) {
      console.log(chalk.white('  Win Rate:'), this.colorizePercent(performance.winRate));
      console.log(chalk.white('  Winning Trades:'), chalk.green(performance.winningTrades));
      console.log(chalk.white('  Losing Trades:'), chalk.red(performance.losingTrades));
    } else {
      console.log(chalk.white('  Closed Trades:'), chalk.gray('0 (no sells yet)'));
    }
    console.log();
    
    // P&L Stats
    console.log(chalk.bold.cyan('💰 PROFIT & LOSS (USD)'));
    console.log(chalk.white('  Realized P&L:'), this.colorizeValue(performance.totalRealizedPnL, 'USD'));
    console.log(chalk.white('  Unrealized P&L:'), this.colorizeValue(performance.totalUnrealizedPnL, 'USD'));
    console.log(chalk.white('  Total P&L:'), this.colorizeValue(performance.totalPnL, 'USD'));
    
    if (performance.totalPnL !== 0 || performance.totalUnrealizedPnL !== 0) {
      console.log(chalk.white('  ROI:'), this.colorizePercent(performance.roi));
    }
    console.log();
    
    // Open Positions
    if (performance.positions.size > 0) {
      console.log(chalk.bold.cyan(`🎯 OPEN POSITIONS (${performance.positions.size})`));
      const positions = Array.from(performance.positions.values())
        .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
        .slice(0, 5);
      
      positions.forEach((pos) => {
        console.log(chalk.white(`  ${pos.symbol}:`));
        console.log(chalk.gray(`    Balance: ${this.formatNumber(pos.balance)} ${pos.symbol}`));
        console.log(chalk.gray(`    Avg Price: ${pos.avgBuyPrice.toFixed(6)}`));
        console.log(chalk.gray(`    Invested: ${pos.totalInvested.toFixed(2)}`));
        
        // Show current value or "Price unavailable"
        if (pos.currentValue > 0) {
          console.log(chalk.gray(`    Current: ${pos.currentValue.toFixed(2)}`));
          console.log(chalk.gray(`    P&L: ${this.colorizeValue(pos.unrealizedPnL, 'USD')} (${this.colorizePercent(pos.unrealizedPnLPercent)})`));
        } else {
          console.log(chalk.gray(`    Current: ${chalk.yellow('Price unavailable')}`));
        }
      });
      
      if (performance.positions.size > 5) {
        console.log(chalk.gray(`  ... and ${performance.positions.size - 5} more positions`));
      }
      console.log();
    }
    
    // Recent Trades
    if (performance.trades.length > 0) {
      console.log(chalk.bold.cyan('📋 RECENT TRADES (Last 5)'));
      const recentTrades = performance.trades.slice(-5).reverse();
      
      recentTrades.forEach((trade) => {
        const typeColor = trade.type === 'BUY' ? chalk.green : chalk.red;
        const typeIcon = trade.type === 'BUY' ? '📥' : '📤';
        
        console.log(typeColor(`  ${typeIcon} ${trade.type} ${trade.tokenSymbol}`));
        console.log(chalk.gray(`    Amount: ${this.formatNumber(trade.tokenAmount)} ${trade.tokenSymbol}`));
        if (trade.usdValue) {
          console.log(chalk.gray(`    Value: ${trade.usdValue.toFixed(2)}`));
        }
        
        if (trade.realizedPnL !== undefined && trade.type === 'SELL') {
          console.log(chalk.gray(`    P&L: ${this.colorizeValue(trade.realizedPnL, 'USD')} (${this.colorizePercent(trade.realizedPnLPercent || 0)})`));
        }
        
        console.log(chalk.gray(`    Time: ${new Date(trade.timestamp).toLocaleString()}`));
      });
    }
    
    console.log(chalk.magenta('═'.repeat(80)) + '\n');
  }

  /**
   * Log a trade with P&L info
   */
  static logTrade(swap: SwapInfo, trade?: Trade): void {
    const dexType = this.detectDEXFromTokens(swap);
    
    console.log('\n' + chalk.cyan('═'.repeat(80)));
    
    if (trade?.type === 'BUY') {
      console.log(chalk.bold.green(`📥 BUY DETECTED ${dexType ? `- ${dexType}` : ''}`));
    } else if (trade?.type === 'SELL') {
      console.log(chalk.bold.red(`📤 SELL DETECTED ${dexType ? `- ${dexType}` : ''}`));
    } else {
      console.log(chalk.bold.yellow(`🔄 TOKEN SWAP ${dexType ? `- ${dexType}` : ''}`));
    }
    
    console.log(chalk.cyan('═'.repeat(80)));
    
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(swap.wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date(swap.timestamp).toLocaleString()));
    
    // Sold section
    console.log();
    console.log(chalk.bold.red('📤 SOLD:'));
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.inputToken.symbol} (${swap.inputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.red(`${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`));
    if (swap.inputToken.usdValue) {
      console.log(chalk.white('  Value:'), chalk.bold.red(`${this.formatNumber(swap.inputToken.usdValue)}`));
    }
    
    // Bought section
    console.log();
    console.log(chalk.bold.green('📥 BOUGHT:'));
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.outputToken.symbol} (${swap.outputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.green(`${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`));
    if (swap.outputToken.usdValue) {
      console.log(chalk.white('  Value:'), chalk.bold.green(`${this.formatNumber(swap.outputToken.usdValue)}`));
    }
    
    // Show P&L ONLY if:
    // 1. It's a SELL trade
    // 2. We have actual P&L data (not undefined/null)
    // 3. The P&L is meaningful (not basically zero)
    const hasMeaningfulPnL = trade?.realizedPnL !== undefined && 
                             trade?.realizedPnL !== null && 
                             Math.abs(trade.realizedPnL) > 0.01;
    
    if (trade?.type === 'SELL' && hasMeaningfulPnL) {
      console.log();
      console.log(chalk.bold.cyan('📊 TRADE RESULT:'));
      console.log(chalk.white('  P&L:'), this.colorizeValue(trade.realizedPnL!, 'USD'));
      console.log(chalk.white('  Return:'), this.colorizePercent(trade.realizedPnLPercent || 0));
    }
    
    console.log();
    console.log(chalk.bold('🔗 Transaction:'));
    console.log(chalk.blue.underline(`  https://solscan.io/tx/${swap.signature}`));
    console.log(chalk.cyan('═'.repeat(80)) + '\n');
  }

  /**
   * Colorize values based on positive/negative
   */
  private static colorizeValue(value: number, unit: string): string {
    const formatted = `${value >= 0 ? '+' : ''}${unit === 'USD' ? '$' : ''}${value.toFixed(2)}${unit === 'USD' ? '' : ' ' + unit}`;
    return value >= 0 ? chalk.green(formatted) : chalk.red(formatted);
  }

  /**
   * Colorize percentages
   */
  private static colorizePercent(percent: number): string {
    const formatted = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    return percent >= 0 ? chalk.green(formatted) : chalk.red(formatted);
  }
}