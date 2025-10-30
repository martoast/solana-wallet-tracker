import chalk from 'chalk';
import { SwapInfo, WalletPerformance, TokenPosition, Trade } from '../types';
import { simpleLogger } from './simpleLogger.js';
import { PerformanceTracker } from '../services/performance';

export class Logger {
  /**
   * Log final report on shutdown
   */
  static logFinalReport(wallets: string[], tracker: PerformanceTracker): void {
    const header = '═'.repeat(100);
    const divider = '─'.repeat(100);
    
    console.log('\n\n');
    console.log(chalk.bold.cyan(header));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('                          🏁 FINAL TRADING SESSION REPORT 🏁                              ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan(header));
    
    simpleLogger.log('');
    simpleLogger.log(header);
    simpleLogger.log('🏁 FINAL TRADING SESSION REPORT');
    simpleLogger.log(header);
    
    const now = new Date();
    const sessionEnd = `Session Ended: ${now.toLocaleString()}`;
    console.log(chalk.white(sessionEnd));
    simpleLogger.log(sessionEnd);
    
    console.log(chalk.cyan(divider));
    simpleLogger.log(divider);
    
    // Process each wallet
    wallets.forEach((wallet, index) => {
      const performance = tracker.getPerformance(wallet);
      
      if (!performance || performance.trades.length === 0) {
        const noTrades = `\n📊 Wallet ${index + 1}: ${this.truncateAddress(wallet)}\n   No trades detected during this session.`;
        console.log(chalk.gray(noTrades));
        simpleLogger.log(noTrades);
        return;
      }
      
      console.log('\n');
      console.log(chalk.bold.magenta(`📊 WALLET ${index + 1}: ${this.truncateAddress(wallet)}`));
      simpleLogger.log('');
      simpleLogger.log(`📊 WALLET ${index + 1}: ${this.truncateAddress(wallet)}`);
      
      // SUMMARY STATS
      console.log('\n' + chalk.bold.cyan('📈 SESSION SUMMARY'));
      simpleLogger.log('');
      simpleLogger.log('📈 SESSION SUMMARY');
      
      const stats = [
        `Total Trades: ${performance.totalTrades}`,
        `Closed Trades: ${performance.winningTrades + performance.losingTrades}`,
        `Open Positions: ${performance.positions.size}`,
      ];
      
      stats.forEach(stat => {
        console.log(chalk.white(`  ${stat}`));
        simpleLogger.log(`  ${stat}`);
      });
      
      // WIN/LOSS STATS
      const totalClosedTrades = performance.winningTrades + performance.losingTrades;
      if (totalClosedTrades > 0) {
        console.log('\n' + chalk.bold.cyan('🎯 WIN/LOSS RECORD'));
        simpleLogger.log('');
        simpleLogger.log('🎯 WIN/LOSS RECORD');
        
        const winRate = `  Win Rate: ${this.formatPercent(performance.winRate)}`;
        const wins = `  Winning Trades: ${performance.winningTrades} 🟢`;
        const losses = `  Losing Trades: ${performance.losingTrades} 🔴`;
        
        console.log(chalk.white('  Win Rate:'), this.colorizePercent(performance.winRate));
        console.log(chalk.white('  Winning Trades:'), chalk.green(`${performance.winningTrades} 🟢`));
        console.log(chalk.white('  Losing Trades:'), chalk.red(`${performance.losingTrades} 🔴`));
        
        simpleLogger.log(winRate);
        simpleLogger.log(wins);
        simpleLogger.log(losses);
      }
      
      // P&L BREAKDOWN
      console.log('\n' + chalk.bold.cyan('💰 PROFIT & LOSS (USD)'));
      simpleLogger.log('');
      simpleLogger.log('💰 PROFIT & LOSS (USD)');
      
      const realizedPnL = `  Realized P&L: ${this.formatValue(performance.totalRealizedPnL, 'USD')}`;
      const unrealizedPnL = `  Unrealized P&L: ${this.formatValue(performance.totalUnrealizedPnL, 'USD')}`;
      const totalPnL = `  Total P&L: ${this.formatValue(performance.totalPnL, 'USD')}`;
      const roi = `  ROI: ${this.formatPercent(performance.roi)}`;
      
      console.log(chalk.white('  Realized P&L:'), this.colorizeValue(performance.totalRealizedPnL, 'USD'));
      console.log(chalk.white('  Unrealized P&L:'), this.colorizeValue(performance.totalUnrealizedPnL, 'USD'));
      console.log(chalk.white('  Total P&L:'), this.colorizeValue(performance.totalPnL, 'USD'));
      console.log(chalk.white('  ROI:'), this.colorizePercent(performance.roi));
      
      simpleLogger.log(realizedPnL);
      simpleLogger.log(unrealizedPnL);
      simpleLogger.log(totalPnL);
      simpleLogger.log(roi);
      
      // TOP 5 WINNERS
      const winners = performance.trades
        .filter(t => t.realizedPnL && t.realizedPnL > 0)
        .sort((a, b) => (b.realizedPnL || 0) - (a.realizedPnL || 0))
        .slice(0, 5);
      
      if (winners.length > 0) {
        console.log('\n' + chalk.bold.green('🏆 TOP 5 WINNING TRADES'));
        simpleLogger.log('');
        simpleLogger.log('🏆 TOP 5 WINNING TRADES');
        
        winners.forEach((trade, i) => {
          const tradeInfo = `  ${i + 1}. ${trade.tokenSymbol}: ${this.formatValue(trade.realizedPnL!, 'USD')} (${this.formatPercent(trade.realizedPnLPercent || 0)})`;
          console.log(chalk.green(tradeInfo));
          simpleLogger.log(tradeInfo);
        });
      }
      
      // TOP 5 LOSERS
      const losers = performance.trades
        .filter(t => t.realizedPnL && t.realizedPnL < 0)
        .sort((a, b) => (a.realizedPnL || 0) - (b.realizedPnL || 0))
        .slice(0, 5);
      
      if (losers.length > 0) {
        console.log('\n' + chalk.bold.red('💔 TOP 5 LOSING TRADES'));
        simpleLogger.log('');
        simpleLogger.log('💔 TOP 5 LOSING TRADES');
        
        losers.forEach((trade, i) => {
          const tradeInfo = `  ${i + 1}. ${trade.tokenSymbol}: ${this.formatValue(trade.realizedPnL!, 'USD')} (${this.formatPercent(trade.realizedPnLPercent || 0)})`;
          console.log(chalk.red(tradeInfo));
          simpleLogger.log(tradeInfo);
        });
      }
      
      // BEST OPEN POSITIONS
      if (performance.positions.size > 0) {
        const topPositions = Array.from(performance.positions.values())
          .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
          .slice(0, 5);
        
        console.log('\n' + chalk.bold.cyan('📊 TOP 5 OPEN POSITIONS'));
        simpleLogger.log('');
        simpleLogger.log('📊 TOP 5 OPEN POSITIONS');
        
        topPositions.forEach((pos, i) => {
          const posInfo = `  ${i + 1}. ${pos.symbol}: ${this.formatValue(pos.unrealizedPnL, 'USD')} (${this.formatPercent(pos.unrealizedPnLPercent)}) - ${this.formatNumber(pos.balance)} tokens`;
          
          if (pos.unrealizedPnL >= 0) {
            console.log(chalk.green(posInfo));
          } else {
            console.log(chalk.red(posInfo));
          }
          simpleLogger.log(posInfo);
        });
      }
      
      // TRADING ACTIVITY
      console.log('\n' + chalk.bold.cyan('⚡ TRADING ACTIVITY'));
      simpleLogger.log('');
      simpleLogger.log('⚡ TRADING ACTIVITY');
      
      const buyTrades = performance.trades.filter(t => t.type === 'BUY').length;
      const sellTrades = performance.trades.filter(t => t.type === 'SELL').length;
      
      const activity = [
        `  Total Buys: ${buyTrades} 📥`,
        `  Total Sells: ${sellTrades} 📤`,
        `  Avg Trade Size: $${this.formatNumber(this.calculateAvgTradeSize(performance))}`,
      ];
      
      activity.forEach(line => {
        console.log(chalk.white(line));
        simpleLogger.log(line);
      });
      
      console.log('\n' + chalk.cyan(divider));
      simpleLogger.log('');
      simpleLogger.log(divider);
    });
    
    console.log('\n' + chalk.bold.cyan(header));
    console.log(chalk.bold.white('                          Thank you for using Solana Wallet Tracker! 🚀'));
    console.log(chalk.bold.cyan(header) + '\n');
    
    simpleLogger.log('');
    simpleLogger.log(header);
    simpleLogger.log('Thank you for using Solana Wallet Tracker! 🚀');
    simpleLogger.log(header);
    simpleLogger.log('');
  }

  /**
   * Calculate average trade size
   */
  private static calculateAvgTradeSize(performance: WalletPerformance): number {
    if (performance.trades.length === 0) return 0;
    
    const totalValue = performance.trades.reduce((sum, trade) => {
      return sum + (trade.usdValue || 0);
    }, 0);
    
    return totalValue / performance.trades.length;
  }

  /**
   * Log a swap transaction with beautiful formatting
   */
  static logSwap(swap: SwapInfo): void {
    // Detect DEX type for display
    const dexType = this.detectDEXFromTokens(swap);
    
    console.log('\n' + chalk.cyan('═'.repeat(80)));
    console.log(chalk.bold.green(`🔄 TOKEN SWAP DETECTED ${dexType ? `- ${dexType}` : ''}`));
    console.log(chalk.cyan('═'.repeat(80)));
    
    simpleLogger.log('');
    simpleLogger.log('═'.repeat(80));
    simpleLogger.log(`🔄 TOKEN SWAP DETECTED ${dexType ? `- ${dexType}` : ''}`);
    simpleLogger.log('═'.repeat(80));
    
    // Wallet info
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(swap.wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date(swap.timestamp).toLocaleString()));
    
    simpleLogger.log(`👛 Wallet: ${this.truncateAddress(swap.wallet)}`);
    simpleLogger.log(`⏰ Time: ${new Date(swap.timestamp).toLocaleString()}`);
    
    // Input token
    console.log('\n' + chalk.bold.red('📤 SOLD:'));
    simpleLogger.log('');
    simpleLogger.log('📤 SOLD:');
    
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.inputToken.symbol} (${swap.inputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.red(`${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`));
    
    simpleLogger.log(`  Token: ${swap.inputToken.symbol} (${swap.inputToken.name})`);
    simpleLogger.log(`  Amount: ${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`);
    
    if (swap.inputToken.usdValue) {
      console.log(chalk.white('  Value:'), chalk.bold.red(`$${this.formatNumber(swap.inputToken.usdValue)}`));
      simpleLogger.log(`  Value: $${this.formatNumber(swap.inputToken.usdValue)}`);
    }
    
    console.log(chalk.white('  Mint:'), chalk.gray(this.truncateAddress(swap.inputToken.mint)));
    simpleLogger.log(`  Mint: ${this.truncateAddress(swap.inputToken.mint)}`);

    // Output token
    console.log('\n' + chalk.bold.green('📥 BOUGHT:'));
    simpleLogger.log('');
    simpleLogger.log('📥 BOUGHT:');
    
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.outputToken.symbol} (${swap.outputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.green(`${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`));
    
    simpleLogger.log(`  Token: ${swap.outputToken.symbol} (${swap.outputToken.name})`);
    simpleLogger.log(`  Amount: ${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`);
    
    if (swap.outputToken.usdValue) {
      console.log(chalk.white('  Value:'), chalk.bold.green(`$${this.formatNumber(swap.outputToken.usdValue)}`));
      simpleLogger.log(`  Value: $${this.formatNumber(swap.outputToken.usdValue)}`);
    }
    
    console.log(chalk.white('  Mint:'), chalk.gray(this.truncateAddress(swap.outputToken.mint)));
    simpleLogger.log(`  Mint: ${this.truncateAddress(swap.outputToken.mint)}`);

    // Transaction link
    console.log('\n' + chalk.bold('🔗 Transaction:'));
    console.log(chalk.blue.underline(`  https://solscan.io/tx/${swap.signature}`));
    console.log(chalk.cyan('═'.repeat(80)) + '\n');
    
    simpleLogger.log('');
    simpleLogger.log('🔗 Transaction:');
    simpleLogger.log(`  https://solscan.io/tx/${swap.signature}`);
    simpleLogger.log('═'.repeat(80));
    simpleLogger.log('');
  }

  /**
   * Log any transaction (transfers, etc)
   */
  static logTransaction(signature: string, wallet: string, tx: any): void {
    const solTransferred = tx.meta?.postBalances && tx.meta?.preBalances
      ? Math.abs((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9)
      : 0;

    const divider = '─'.repeat(80);
    console.log('\n' + chalk.gray(divider));
    console.log(chalk.bold.blue('📋 TRANSACTION DETECTED'));
    console.log(chalk.gray(divider));
    
    simpleLogger.log('');
    simpleLogger.log(divider);
    simpleLogger.log('📋 TRANSACTION DETECTED');
    simpleLogger.log(divider);
    
    const walletLine = `👛 Wallet: ${this.truncateAddress(wallet)}`;
    const timeLine = `⏰ Time: ${new Date().toLocaleString()}`;
    const typeLine = `📊 Type: General Transaction`;
    
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date().toLocaleString()));
    console.log(chalk.bold('📊 Type:'), chalk.white('General Transaction'));
    
    simpleLogger.log(walletLine);
    simpleLogger.log(timeLine);
    simpleLogger.log(typeLine);
    
    if (solTransferred > 0) {
      const solLine = `💰 SOL Moved: ${solTransferred.toFixed(4)} SOL`;
      console.log(chalk.bold('💰 SOL Moved:'), chalk.cyan(`${solTransferred.toFixed(4)} SOL`));
      simpleLogger.log(solLine);
    }
    
    const linkLine = `🔗 Link: https://solscan.io/tx/${signature}`;
    console.log(chalk.bold('🔗 Link:'), chalk.blue.underline(`https://solscan.io/tx/${signature}`));
    console.log(chalk.gray(divider) + '\n');
    
    simpleLogger.log(linkLine);
    simpleLogger.log(divider);
    simpleLogger.log('');
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
    console.log(chalk.bold.magenta('📝 Log File:'), chalk.white(simpleLogger.getPath()));
    console.log(chalk.gray('\n⏳ Waiting for transactions...\n'));
    
    // Log to file
    simpleLogger.log('TRACKING STARTED');
    simpleLogger.log(`Wallets: ${wallets.length}`);
    wallets.forEach((w, i) => simpleLogger.log(`  ${i + 1}. ${w}`));
    simpleLogger.log('');
  }

  /**
   * Log errors
   */
  static error(message: string, error?: any): void {
    console.error(chalk.bold.red('❌ ERROR:'), chalk.white(message));
    if (error) {
      console.error(chalk.gray(error.message || error));
    }
    simpleLogger.log(`ERROR: ${message}`);
    if (error) simpleLogger.log(`  ${error.message || error}`);
  }

  /**
   * Log info messages
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ️ '), chalk.white(message));
    simpleLogger.log(`INFO: ${message}`);
  }

  /**
   * Log success messages
   */
  static success(message: string): void {
    console.log(chalk.green('✅'), chalk.white(message));
    simpleLogger.log(`✅ ${message}`);
  }

  /**
   * Log warnings
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠️ '), chalk.white(message));
    simpleLogger.log(`⚠️  ${message}`);
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
    const header = '═'.repeat(80);
    
    console.log('\n' + chalk.magenta(header));
    console.log(chalk.bold.magenta('📊 WALLET PERFORMANCE DASHBOARD'));
    console.log(chalk.magenta(header));
    
    simpleLogger.log('');
    simpleLogger.log(header);
    simpleLogger.log('📊 WALLET PERFORMANCE DASHBOARD');
    simpleLogger.log(header);
    
    const walletLine = `👛 Wallet: ${this.truncateAddress(performance.walletAddress)}`;
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(performance.walletAddress)));
    console.log();
    
    simpleLogger.log(walletLine);
    simpleLogger.log('');
    
    // Overall Stats
    console.log(chalk.bold.cyan('📈 OVERALL STATS'));
    simpleLogger.log('📈 OVERALL STATS');
    
    const totalTrades = `  Total Trades: ${performance.totalTrades}`;
    console.log(chalk.white('  Total Trades:'), chalk.bold(performance.totalTrades));
    simpleLogger.log(totalTrades);
    
    const totalClosedTrades = performance.winningTrades + performance.losingTrades;
    if (totalClosedTrades > 0) {
      const winRate = `  Win Rate: ${this.formatPercent(performance.winRate)}`;
      const winTrades = `  Winning Trades: ${performance.winningTrades}`;
      const loseTrades = `  Losing Trades: ${performance.losingTrades}`;
      
      console.log(chalk.white('  Win Rate:'), this.colorizePercent(performance.winRate));
      console.log(chalk.white('  Winning Trades:'), chalk.green(performance.winningTrades));
      console.log(chalk.white('  Losing Trades:'), chalk.red(performance.losingTrades));
      
      simpleLogger.log(winRate);
      simpleLogger.log(winTrades);
      simpleLogger.log(loseTrades);
    } else {
      const noTrades = '  Closed Trades: 0 (no sells yet)';
      console.log(chalk.white('  Closed Trades:'), chalk.gray('0 (no sells yet)'));
      simpleLogger.log(noTrades);
    }
    console.log();
    simpleLogger.log('');
    
    // P&L Stats
    console.log(chalk.bold.cyan('💰 PROFIT & LOSS (USD)'));
    simpleLogger.log('💰 PROFIT & LOSS (USD)');
    
    const realizedPnL = `  Realized P&L: ${this.formatValue(performance.totalRealizedPnL, 'USD')}`;
    const unrealizedPnL = `  Unrealized P&L: ${this.formatValue(performance.totalUnrealizedPnL, 'USD')}`;
    const totalPnL = `  Total P&L: ${this.formatValue(performance.totalPnL, 'USD')}`;
    
    console.log(chalk.white('  Realized P&L:'), this.colorizeValue(performance.totalRealizedPnL, 'USD'));
    console.log(chalk.white('  Unrealized P&L:'), this.colorizeValue(performance.totalUnrealizedPnL, 'USD'));
    console.log(chalk.white('  Total P&L:'), this.colorizeValue(performance.totalPnL, 'USD'));
    
    simpleLogger.log(realizedPnL);
    simpleLogger.log(unrealizedPnL);
    simpleLogger.log(totalPnL);
    
    if (performance.totalPnL !== 0 || performance.totalUnrealizedPnL !== 0) {
      const roi = `  ROI: ${this.formatPercent(performance.roi)}`;
      console.log(chalk.white('  ROI:'), this.colorizePercent(performance.roi));
      simpleLogger.log(roi);
    }
    console.log();
    simpleLogger.log('');
    
    // Open Positions
    if (performance.positions.size > 0) {
      const posHeader = `🎯 OPEN POSITIONS (${performance.positions.size})`;
      console.log(chalk.bold.cyan(posHeader));
      simpleLogger.log(posHeader);
      
      const positions = Array.from(performance.positions.values())
        .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
        .slice(0, 5);
      
      positions.forEach((pos) => {
        console.log(chalk.white(`  ${pos.symbol}:`));
        simpleLogger.log(`  ${pos.symbol}:`);
        
        const balance = `    Balance: ${this.formatNumber(pos.balance)} ${pos.symbol}`;
        const avgPrice = `    Avg Price: ${pos.avgBuyPrice.toFixed(6)}`;
        const invested = `    Invested: ${pos.totalInvested.toFixed(2)}`;
        
        console.log(chalk.gray(`    Balance: ${this.formatNumber(pos.balance)} ${pos.symbol}`));
        console.log(chalk.gray(`    Avg Price: ${pos.avgBuyPrice.toFixed(6)}`));
        console.log(chalk.gray(`    Invested: ${pos.totalInvested.toFixed(2)}`));
        
        simpleLogger.log(balance);
        simpleLogger.log(avgPrice);
        simpleLogger.log(invested);
        
        if (pos.currentValue > 0) {
          const current = `    Current: ${pos.currentValue.toFixed(2)}`;
          const pnl = `    P&L: ${this.formatValue(pos.unrealizedPnL, 'USD')} (${this.formatPercent(pos.unrealizedPnLPercent)})`;
          
          console.log(chalk.gray(`    Current: ${pos.currentValue.toFixed(2)}`));
          console.log(chalk.gray(`    P&L: ${this.colorizeValue(pos.unrealizedPnL, 'USD')} (${this.colorizePercent(pos.unrealizedPnLPercent)})`));
          
          simpleLogger.log(current);
          simpleLogger.log(pnl);
        } else {
          const unavail = `    Current: Price unavailable`;
          console.log(chalk.gray(`    Current: ${chalk.yellow('Price unavailable')}`));
          simpleLogger.log(unavail);
        }
      });
      
      if (performance.positions.size > 5) {
        const more = `  ... and ${performance.positions.size - 5} more positions`;
        console.log(chalk.gray(more));
        simpleLogger.log(more);
      }
      console.log();
      simpleLogger.log('');
    }
    
    // Recent Trades
    if (performance.trades.length > 0) {
      console.log(chalk.bold.cyan('📋 RECENT TRADES (Last 5)'));
      simpleLogger.log('📋 RECENT TRADES (Last 5)');
      
      const recentTrades = performance.trades.slice(-5).reverse();
      
      recentTrades.forEach((trade) => {
        const typeColor = trade.type === 'BUY' ? chalk.green : chalk.red;
        const typeIcon = trade.type === 'BUY' ? '📥' : '📤';
        
        const tradeLine = `  ${typeIcon} ${trade.type} ${trade.tokenSymbol}`;
        const amount = `    Amount: ${this.formatNumber(trade.tokenAmount)} ${trade.tokenSymbol}`;
        
        console.log(typeColor(tradeLine));
        console.log(chalk.gray(amount));
        
        simpleLogger.log(tradeLine);
        simpleLogger.log(amount);
        
        if (trade.usdValue) {
          const value = `    Value: ${trade.usdValue.toFixed(2)}`;
          console.log(chalk.gray(value));
          simpleLogger.log(value);
        }
        
        if (trade.realizedPnL !== undefined && trade.type === 'SELL') {
          const pnl = `    P&L: ${this.formatValue(trade.realizedPnL, 'USD')} (${this.formatPercent(trade.realizedPnLPercent || 0)})`;
          console.log(chalk.gray(`    P&L: ${this.colorizeValue(trade.realizedPnL, 'USD')} (${this.colorizePercent(trade.realizedPnLPercent || 0)})`));
          simpleLogger.log(pnl);
        }
        
        const time = `    Time: ${new Date(trade.timestamp).toLocaleString()}`;
        console.log(chalk.gray(time));
        simpleLogger.log(time);
      });
    }
    
    console.log(chalk.magenta(header) + '\n');
    simpleLogger.log(header);
    simpleLogger.log('');
  }

  /**
   * Log a trade with P&L info
   */
  static logTrade(swap: SwapInfo, trade?: Trade): void {
    const dexType = this.detectDEXFromTokens(swap);
    const header = '═'.repeat(80);
    
    let title = '';
    if (trade?.type === 'BUY') {
      title = `📥 BUY DETECTED ${dexType ? `- ${dexType}` : ''}`;
      console.log('\n' + chalk.cyan(header));
      console.log(chalk.bold.green(title));
    } else if (trade?.type === 'SELL') {
      title = `📤 SELL DETECTED ${dexType ? `- ${dexType}` : ''}`;
      console.log('\n' + chalk.cyan(header));
      console.log(chalk.bold.red(title));
    } else {
      title = `🔄 TOKEN SWAP ${dexType ? `- ${dexType}` : ''}`;
      console.log('\n' + chalk.cyan(header));
      console.log(chalk.bold.yellow(title));
    }
    
    console.log(chalk.cyan(header));
    
    simpleLogger.log('');
    simpleLogger.log(header);
    simpleLogger.log(title);
    simpleLogger.log(header);
    
    const walletLine = `👛 Wallet: ${this.truncateAddress(swap.wallet)}`;
    const timeLine = `⏰ Time: ${new Date(swap.timestamp).toLocaleString()}`;
    
    console.log(chalk.bold('👛 Wallet:'), chalk.yellow(this.truncateAddress(swap.wallet)));
    console.log(chalk.bold('⏰ Time:'), chalk.white(new Date(swap.timestamp).toLocaleString()));
    
    simpleLogger.log(walletLine);
    simpleLogger.log(timeLine);
    
    // Sold section
    console.log();
    console.log(chalk.bold.red('📤 SOLD:'));
    simpleLogger.log('');
    simpleLogger.log('📤 SOLD:');
    
    const soldToken = `  Token: ${swap.inputToken.symbol} (${swap.inputToken.name})`;
    const soldAmount = `  Amount: ${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`;
    
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.inputToken.symbol} (${swap.inputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.red(`${this.formatNumber(swap.inputToken.uiAmount)} ${swap.inputToken.symbol}`));
    
    simpleLogger.log(soldToken);
    simpleLogger.log(soldAmount);
    
    if (swap.inputToken.usdValue) {
      const soldValue = `  Value: ${this.formatNumber(swap.inputToken.usdValue)}`;
      console.log(chalk.white('  Value:'), chalk.bold.red(`${this.formatNumber(swap.inputToken.usdValue)}`));
      simpleLogger.log(soldValue);
    }
    
    // Bought section
    console.log();
    console.log(chalk.bold.green('📥 BOUGHT:'));
    simpleLogger.log('');
    simpleLogger.log('📥 BOUGHT:');
    
    const boughtToken = `  Token: ${swap.outputToken.symbol} (${swap.outputToken.name})`;
    const boughtAmount = `  Amount: ${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`;
    
    console.log(chalk.white('  Token:'), chalk.bold(`${swap.outputToken.symbol} (${swap.outputToken.name})`));
    console.log(chalk.white('  Amount:'), chalk.bold.green(`${this.formatNumber(swap.outputToken.uiAmount)} ${swap.outputToken.symbol}`));
    
    simpleLogger.log(boughtToken);
    simpleLogger.log(boughtAmount);
    
    if (swap.outputToken.usdValue) {
      const boughtValue = `  Value: ${this.formatNumber(swap.outputToken.usdValue)}`;
      console.log(chalk.white('  Value:'), chalk.bold.green(`${this.formatNumber(swap.outputToken.usdValue)}`));
      simpleLogger.log(boughtValue);
    }
    
    // P&L section
    const hasMeaningfulPnL = trade?.realizedPnL !== undefined && 
                             trade?.realizedPnL !== null && 
                             Math.abs(trade.realizedPnL) > 0.01;
    
    if (trade?.type === 'SELL' && hasMeaningfulPnL) {
      console.log();
      console.log(chalk.bold.cyan('📊 TRADE RESULT:'));
      simpleLogger.log('');
      simpleLogger.log('📊 TRADE RESULT:');
      
      const pnlLine = `  P&L: ${this.formatValue(trade.realizedPnL!, 'USD')}`;
      const returnLine = `  Return: ${this.formatPercent(trade.realizedPnLPercent || 0)}`;
      
      console.log(chalk.white('  P&L:'), this.colorizeValue(trade.realizedPnL!, 'USD'));
      console.log(chalk.white('  Return:'), this.colorizePercent(trade.realizedPnLPercent || 0));
      
      simpleLogger.log(pnlLine);
      simpleLogger.log(returnLine);
    }
    
    console.log();
    console.log(chalk.bold('🔗 Transaction:'));
    const txLink = `  https://solscan.io/tx/${swap.signature}`;
    console.log(chalk.blue.underline(txLink));
    console.log(chalk.cyan(header) + '\n');
    
    simpleLogger.log('');
    simpleLogger.log('🔗 Transaction:');
    simpleLogger.log(txLink);
    simpleLogger.log(header);
    simpleLogger.log('');
  }

  /**
   * Format value for plain text
   */
  private static formatValue(value: number, unit: string): string {
    return `${value >= 0 ? '+' : ''}${unit === 'USD' ? '$' : ''}${value.toFixed(2)}${unit === 'USD' ? '' : ' ' + unit}`;
  }

  /**
   * Format percent for plain text
   */
  private static formatPercent(percent: number): string {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
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