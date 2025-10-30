import fs from 'fs';
import path from 'path';

class SimpleFileLogger {
  private logFilePath: string;

  constructor() {
    // Create logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create log file with timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    this.logFilePath = path.join(logsDir, `tracker-${timestamp}.txt`);
    
    // Write header immediately with sync
    const header = [
      '═══════════════════════════════════════════════════════════════════════════',
      '          SOLANA WALLET TRACKER V2 - SESSION LOG',
      '═══════════════════════════════════════════════════════════════════════════',
      `Session Started: ${now.toLocaleString()}`,
      `Log File: tracker-${timestamp}.txt`,
      '═══════════════════════════════════════════════════════════════════════════',
      '',
      ''
    ].join('\n');
    
    fs.writeFileSync(this.logFilePath, header);
    console.log(`📝 Log file created: ${this.logFilePath}`);
  }

  /**
   * Append to log file synchronously (guaranteed to write)
   */
  log(message: string): void {
    try {
      // Strip ANSI color codes
      const clean = message.replace(/\u001b\[[0-9;]*m/g, '');
      // Append synchronously with newline
      fs.appendFileSync(this.logFilePath, clean + '\n');
    } catch (error) {
      console.error('Failed to write to log:', error);
    }
  }

  /**
   * Get the log file path
   */
  getPath(): string {
    return this.logFilePath;
  }

  /**
   * Close the log (write end message)
   */
  close(): void {
    const end = `\n\nSession Ended: ${new Date().toLocaleString()}\n`;
    fs.appendFileSync(this.logFilePath, end);
  }
}

export const simpleLogger = new SimpleFileLogger();