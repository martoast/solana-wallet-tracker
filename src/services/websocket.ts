import WebSocket from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import { TransactionParser } from './parser';
import { performanceTracker } from './performance';
import { Logger } from '../utils/logger';
import { config } from '../config/env';
import { TransactionMessage } from '../types';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const NATIVE_MINT = 'So11111111111111111111111111111111111111112';

export class WalletTracker {
  private ws: WebSocket | null = null;
  private connection: Connection;
  private parser: TransactionParser;
  private subscriptionIds: Map<string, number> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private tradesProcessed = 0;
  private readonly TRADES_BETWEEN_DASHBOARDS = 10;

  constructor() {
    this.connection = new Connection(config.rpcHttp, {
      commitment: 'confirmed',
      wsEndpoint: config.rpcWs
    });
    this.parser = new TransactionParser(this.connection);
  }

  /**
   * Start tracking wallets
   */
  async start(): Promise<void> {
    Logger.logStartup(config.trackedWallets);
    
    // Initialize performance tracking for all wallets
    if (config.trackPerformance) {
      config.trackedWallets.forEach(wallet => {
        performanceTracker.initializeWallet(wallet);
      });
    }
    
    // Connect to real-time WebSocket
    await this.connect();
  }

  /**
   * Connect to WebSocket
   */
  private async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(config.rpcWs);

      this.ws.on('open', () => {
        Logger.success('Connected to Solana WebSocket');
        this.reconnectAttempts = 0;
        this.subscribeToWallets();
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        await this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        Logger.error('WebSocket error', error);
      });

      this.ws.on('close', () => {
        Logger.warn('WebSocket connection closed');
        this.handleReconnect();
      });

    } catch (error) {
      Logger.error('Failed to connect to WebSocket', error);
      this.handleReconnect();
    }
  }

  /**
   * Subscribe to wallet transactions
   */
  private subscribeToWallets(): void {
    config.trackedWallets.forEach((wallet) => {
      this.subscribeToWallet(wallet);
    });
  }

  /**
   * Subscribe to a single wallet
   */
  private subscribeToWallet(walletAddress: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      Logger.error('WebSocket not connected');
      return;
    }

    const subscriptionId = Math.floor(Math.random() * 1000000);
    
    const subscribeMessage = {
      jsonrpc: '2.0',
      id: subscriptionId,
      method: 'logsSubscribe',
      params: [
        {
          mentions: [walletAddress]
        },
        {
          commitment: 'confirmed'
        }
      ]
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.subscriptionIds.set(walletAddress, subscriptionId);
    
    Logger.info(`Subscribed to wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      // Handle subscription confirmations
      if (message.result && typeof message.result === 'number') {
        return;
      }

      // Handle log notifications
      if (message.method === 'logsNotification' && message.params) {
        const { signature } = message.params.result.value;
        
        // Fetch the full transaction
        await this.processTransaction(signature);
      }

    } catch (error) {
      // Silent fail for message handling
    }
  }

  /**
   * Check if a token is a base token (SOL, USDC, USDT)
   */
  private isBaseToken(mint: string): boolean {
    return mint === NATIVE_MINT || mint === USDC_MINT || mint === USDT_MINT;
  }

  /**
   * Process a transaction by signature
   */
  private async processTransaction(signature: string): Promise<void> {
    try {
      // Small delay to ensure transaction is confirmed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) {
        return;
      }

      // Get account keys - handle both legacy and v0 transactions with ALTs
      let accountKeys: string[];
      try {
        const keys = tx.transaction.message.getAccountKeys({
          addressLookupTableAccounts: tx.meta?.loadedAddresses ? [
            {
              accountKey: new PublicKey('11111111111111111111111111111111'),
              state: {
                addresses: [
                  ...(tx.meta.loadedAddresses.writable || []).map((addr: any) => new PublicKey(addr)),
                  ...(tx.meta.loadedAddresses.readonly || []).map((addr: any) => new PublicKey(addr))
                ]
              }
            }
          ] as any : undefined
        });
        accountKeys = keys.staticAccountKeys.map(k => k.toString());
        
        // Add loaded addresses
        if (tx.meta?.loadedAddresses) {
          if (tx.meta.loadedAddresses.writable) {
            accountKeys.push(...tx.meta.loadedAddresses.writable.map(k => k.toString()));
          }
          if (tx.meta.loadedAddresses.readonly) {
            accountKeys.push(...tx.meta.loadedAddresses.readonly.map(k => k.toString()));
          }
        }
      } catch (error) {
        // Fallback: just use static keys and meta loaded addresses
        const staticKeys = tx.transaction.message.staticAccountKeys || [];
        accountKeys = staticKeys.map(k => k.toString());
        
        if (tx.meta?.loadedAddresses) {
          if (tx.meta.loadedAddresses.writable) {
            accountKeys.push(...tx.meta.loadedAddresses.writable.map(k => k.toString()));
          }
          if (tx.meta.loadedAddresses.readonly) {
            accountKeys.push(...tx.meta.loadedAddresses.readonly.map(k => k.toString()));
          }
        }
      }

      // Find which wallet this transaction belongs to
      const relevantWallet = config.trackedWallets.find(wallet =>
        accountKeys.some(key => key === wallet)
      );

      if (!relevantWallet) {
        return;
      }

      // Parse the transaction
      const txData: TransactionMessage = {
        signature,
        slot: tx.slot,
        transaction: {
          message: {
            instructions: [],
            accountKeys: accountKeys
          },
          signatures: tx.transaction.signatures
        },
        meta: {
          preBalances: tx.meta?.preBalances || [],
          postBalances: tx.meta?.postBalances || [],
          preTokenBalances: tx.meta?.preTokenBalances || [],
          postTokenBalances: tx.meta?.postTokenBalances || []
        }
      };

      // Try to parse as swap
      const swapInfo = await this.parser.parseTransaction(txData, relevantWallet);

      if (swapInfo) {
        // Check if this is a REAL token swap (different tokens)
        const isDifferentTokens = swapInfo.inputToken.mint !== swapInfo.outputToken.mint;
        const isNotJustTransfer = swapInfo.inputToken.symbol !== swapInfo.outputToken.symbol;
        
        // Check if both tokens are base tokens (SOL, USDC, USDT)
        const inputIsBase = this.isBaseToken(swapInfo.inputToken.mint);
        const outputIsBase = this.isBaseToken(swapInfo.outputToken.mint);
        const isBothBaseTokens = inputIsBase && outputIsBase;
        
        // Skip if:
        // - Same tokens OR
        // - Just a transfer OR
        // - Base-to-base conversions (SOL→USDC, USDC→USDT, etc.)
        if (!isDifferentTokens || !isNotJustTransfer || isBothBaseTokens) {
          return;
        }
        
        // Filter by minimum USD value
        const totalValue = (swapInfo.inputToken.usdValue || 0) + (swapInfo.outputToken.usdValue || 0);
        
        if (totalValue >= config.minSwapValueUsd || totalValue === 0) {
          // Track performance if enabled
          if (config.trackPerformance) {
            await performanceTracker.processSwap(swapInfo);
            const performance = performanceTracker.getPerformance(relevantWallet);
            
            // Only log if we actually tracked this trade
            const lastTrade = performance?.trades[performance.trades.length - 1];
            
            // Check if this swap was actually tracked
            if (lastTrade && lastTrade.signature === swapInfo.signature) {
              Logger.logTrade(swapInfo, lastTrade);
              this.tradesProcessed++;
              
              // Show dashboard every N trades
              if (this.tradesProcessed % this.TRADES_BETWEEN_DASHBOARDS === 0) {
                this.showPerformanceDashboard();
              }
            } else if (!outputIsBase || !inputIsBase) {
              // If it's a buy (not tracked as no position), still show it
              const isSell = !inputIsBase && outputIsBase;
              if (!isSell) {
                Logger.logTrade(swapInfo, lastTrade);
                this.tradesProcessed++;
                
                // Show dashboard every N trades
                if (this.tradesProcessed % this.TRADES_BETWEEN_DASHBOARDS === 0) {
                  this.showPerformanceDashboard();
                }
              }
            }
          } else {
            Logger.logSwap(swapInfo);
          }
        }
      } else if (!config.showOnlyTokenSwaps) {
        // Check if this is just a small fee transaction
        const solMoved = tx.meta?.postBalances && tx.meta?.preBalances
          ? Math.abs((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9)
          : 0;
        
        // Skip tiny transactions (< 0.001 SOL, likely just fees)
        if (solMoved < 0.001) {
          return;
        }
        
        // Show all other significant transactions
        Logger.logTransaction(signature, relevantWallet, tx);
      }

    } catch (error) {
      // Silent fail for transaction processing
    }
  }

  /**
   * Show performance dashboard for all tracked wallets
   */
  private showPerformanceDashboard(): void {
    config.trackedWallets.forEach(wallet => {
      const performance = performanceTracker.getPerformance(wallet);
      if (performance && performance.trades.length > 0) {
        Logger.logPerformance(performance);
      }
    });
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.error('Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }

    this.reconnectAttempts++;
    Logger.info(`Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    Logger.info('Shutting down...');
    
    if (this.ws) {
      this.ws.close();
    }

    Logger.success('Shutdown complete');
  }
}