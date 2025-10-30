import fs from 'fs';
import path from 'path';

class FileLogger {
  private logFilePath: string;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    this.logFilePath = path.join(logsDir, `wallet-tracker-${timestamp}-${timeStr}.txt`);
    
    // Create write stream
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    
    // Write header
    this.writeHeader();
  }

  private writeHeader(): void {
    const header = [
      '═══════════════════════════════════════════════════════════════════════════',
      '          SOLANA WALLET TRACKER V2 - SESSION LOG',
      '═══════════════════════════════════════════════════════════════════════════',
      `Session Started: ${new Date().toLocaleString()}`,
      `Log File: ${path.basename(this.logFilePath)}`,
      '═══════════════════════════════════════════════════════════════════════════',
      ''
    ].join('\n');
    
    this.write(header);
  }

  /**
   * Write to log file (strips ANSI color codes)
   */
  write(message: string): void {
    if (!this.logStream) return;
    
    // Strip ANSI color codes for clean file output
    const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '');
    
    this.logStream.write(cleanMessage + '\n');
  }

  /**
   * Log a trade
   */
  logTrade(data: {
    type: 'BUY' | 'SELL';
    wallet: string;
    timestamp: number;
    inputToken: { symbol: string; amount: number; value?: number };
    outputToken: { symbol: string; amount: number; value?: number };
    signature: string;
    pnl?: { amount: number; percent: number };
  }): void {
    const lines = [
      '',
      '═'.repeat(80),
      `${data.type} DETECTED`,
      '═'.repeat(80),
      `Wallet: ${data.wallet}`,
      `Time: ${new Date(data.timestamp).toLocaleString()}`,
      '',
      '📤 SOLD:',
      `  Token: ${data.inputToken.symbol}`,
      `  Amount: ${data.inputToken.amount.toFixed(4)}`,
      data.inputToken.value ? `  Value: $${data.inputToken.value.toFixed(2)}` : '',
      '',
      '📥 BOUGHT:',
      `  Token: ${data.outputToken.symbol}`,
      `  Amount: ${data.outputToken.amount.toFixed(4)}`,
      data.outputToken.value ? `  Value: $${data.outputToken.value.toFixed(2)}` : '',
    ].filter(line => line !== '');

    if (data.pnl && Math.abs(data.pnl.amount) > 0.01) {
      lines.push('');
      lines.push('📊 TRADE RESULT:');
      lines.push(`  P&L: ${data.pnl.amount >= 0 ? '+' : ''}$${data.pnl.amount.toFixed(2)}`);
      lines.push(`  Return: ${data.pnl.percent >= 0 ? '+' : ''}${data.pnl.percent.toFixed(2)}%`);
    }

    lines.push('');
    lines.push(`Transaction: https://solscan.io/tx/${data.signature}`);
    lines.push('═'.repeat(80));

    this.write(lines.join('\n'));
  }

  /**
   * Log performance dashboard
   */
  logPerformance(data: {
    wallet: string;
    totalTrades: number;
    winRate: number;
    winningTrades: number;
    losingTrades: number;
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
    roi: number;
    topPositions: Array<{
      symbol: string;
      balance: number;
      invested: number;
      current: number;
      pnl: number;
      pnlPercent: number;
    }>;
  }): void {
    const lines = [
      '',
      '═'.repeat(80),
      'WALLET PERFORMANCE DASHBOARD',
      '═'.repeat(80),
      `Wallet: ${data.wallet}`,
      `Time: ${new Date().toLocaleString()}`,
      '',
      '📈 OVERALL STATS',
      `  Total Trades: ${data.totalTrades}`,
    ];

    const totalClosedTrades = data.winningTrades + data.losingTrades;
    if (totalClosedTrades > 0) {
      lines.push(`  Win Rate: ${data.winRate.toFixed(2)}%`);
      lines.push(`  Winning Trades: ${data.winningTrades}`);
      lines.push(`  Losing Trades: ${data.losingTrades}`);
    } else {
      lines.push('  Closed Trades: 0 (no sells yet)');
    }

    lines.push('');
    lines.push('💰 PROFIT & LOSS (USD)');
    lines.push(`  Realized P&L: ${data.realizedPnL >= 0 ? '+' : ''}$${data.realizedPnL.toFixed(2)}`);
    lines.push(`  Unrealized P&L: ${data.unrealizedPnL >= 0 ? '+' : ''}$${data.unrealizedPnL.toFixed(2)}`);
    lines.push(`  Total P&L: ${data.totalPnL >= 0 ? '+' : ''}$${data.totalPnL.toFixed(2)}`);
    
    if (data.totalPnL !== 0 || data.unrealizedPnL !== 0) {
      lines.push(`  ROI: ${data.roi >= 0 ? '+' : ''}${data.roi.toFixed(2)}%`);
    }

    if (data.topPositions.length > 0) {
      lines.push('');
      lines.push(`🎯 TOP POSITIONS (${data.topPositions.length})`);
      data.topPositions.forEach(pos => {
        lines.push(`  ${pos.symbol}:`);
        lines.push(`    Balance: ${pos.balance.toFixed(2)} ${pos.symbol}`);
        lines.push(`    Invested: $${pos.invested.toFixed(2)}`);
        if (pos.current > 0) {
          lines.push(`    Current: $${pos.current.toFixed(2)}`);
          lines.push(`    P&L: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)} (${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%)`);
        } else {
          lines.push('    Current: Price unavailable');
        }
      });
    }

    lines.push('═'.repeat(80));
    this.write(lines.join('\n'));
  }

  /**
   * Log startup info
   */
  logStartup(wallets: string[]): void {
    const lines = [
      '',
      'TRACKING STARTED',
      `Wallets: ${wallets.length}`,
      ...wallets.map((w, i) => `  ${i + 1}. ${w}`),
      ''
    ];
    this.write(lines.join('\n'));
  }

  /**
   * Log errors
   */
  logError(message: string, error?: any): void {
    const lines = [
      '',
      `ERROR: ${message}`,
      error ? `Details: ${error.message || error}` : '',
      ''
    ].filter(line => line !== '');
    
    this.write(lines.join('\n'));
  }

  /**
   * Log info messages
   */
  logInfo(message: string): void {
    this.write(`INFO: ${message}`);
  }

  /**
   * Close the log stream
   */
  close(): void {
    if (this.logStream) {
      this.write(`\nSession Ended: ${new Date().toLocaleString()}`);
      this.logStream.end();
      this.logStream = null;
    }
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}

export const fileLogger = new FileLogger();