import WebSocket from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import { TransactionParser } from './parser';
import { Logger } from '../utils/logger';
import { config } from '../config/env';
import { TransactionMessage } from '../types';

export class WalletTracker {
  private ws: WebSocket | null = null;
  private connection: Connection;
  private parser: TransactionParser;
  private subscriptionIds: Map<string, number> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

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
      Logger.error('Error handling message', error);
    }
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

      // Get account keys properly from versioned transaction
      const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys.map(k => k.toString());

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

      // Try to parse as swap first
      const swapInfo = await this.parser.parseTransaction(txData, relevantWallet);

      if (swapInfo) {
        // Filter by minimum USD value if configured
        const totalValue = (swapInfo.inputToken.usdValue || 0) + (swapInfo.outputToken.usdValue || 0);
        if (totalValue >= config.minSwapValueUsd) {
          Logger.logSwap(swapInfo);
        }
      } else {
        // Show all other transactions
        Logger.logTransaction(signature, relevantWallet, tx);
      }

    } catch (error) {
      // Silent fail for transaction processing errors
      // (some transactions may fail to parse, which is normal)
    }
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