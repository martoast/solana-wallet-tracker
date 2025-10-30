import { validateConfig } from './config/env';
import { WalletTracker } from './services/websocket';
import { Logger } from './utils/logger';
import { fileLogger } from './utils/fileLogger';

/**
 * Main entry point
 */
async function main() {
  try {
    // Validate configuration
    validateConfig();

    // Create and start tracker
    const tracker = new WalletTracker();
    await tracker.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n');
      Logger.info('Received SIGINT, shutting down gracefully...');
      await tracker.shutdown();
      fileLogger.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n');
      Logger.info('Received SIGTERM, shutting down gracefully...');
      await tracker.shutdown();
      fileLogger.close();
      process.exit(0);
    });

  } catch (error) {
    Logger.error('Fatal error', error);
    fileLogger.close();
    process.exit(1);
  }
}

// Start the application
main();