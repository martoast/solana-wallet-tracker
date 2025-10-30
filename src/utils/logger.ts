import chalk from 'chalk';
import { SwapInfo } from '../types';

export class Logger {
  /**
   * Log a swap transaction with beautiful formatting
   */
  static logSwap(swap: SwapInfo): void {
    // Detect DEX type for display
    const dexType = this.detectDEXFromTokens(swap);
    
    console.log('\n' + chalk.cyan('═'.repeat(80)));
    console.log(chalk.bold.green(`🔄 NEW SWAP DETECTED ${dexType ? `- ${dexType}` : ''}`));
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
    console.log(chalk.bold.cyan('║') + chalk.bold.white('           🚀 SOLANA WALLET TRACKER - JUPITER EDITION 🚀              ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.bold.green('📊 Status:'), chalk.white('ACTIVE'));
    console.log(chalk.bold.yellow('👛 Tracking Wallets:'));
    wallets.forEach((wallet, index) => {
      console.log(chalk.white(`   ${index + 1}. ${this.truncateAddress(wallet)}`));
    });
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
    if (num < 0.01) {
      return num.toExponential(2);
    }
    return num.toFixed(4);
  }

  /**
   * Detect DEX type from swap info
   */
  private static detectDEXFromTokens(swap: SwapInfo): string {
    // Check if tokens are commonly associated with specific DEXs
    // This is a simple heuristic - you can expand this
    const tokenSymbols = [swap.inputToken.symbol, swap.outputToken.symbol];
    
    // Pump.fun typically has one side as SOL and unknown/new tokens
    if ((swap.inputToken.symbol === 'SOL' || swap.outputToken.symbol === 'SOL') &&
        (swap.inputToken.symbol === 'UNKNOWN' || swap.outputToken.symbol === 'UNKNOWN' ||
         swap.inputToken.name.includes('Unknown') || swap.outputToken.name.includes('Unknown'))) {
      return 'PUMP.FUN';
    }
    
    return '';
  }
}