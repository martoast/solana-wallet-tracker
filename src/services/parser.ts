import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getMint, NATIVE_MINT } from '@solana/spl-token';
import { SwapInfo, TransactionMessage } from '../types';
import { jupiterService } from './jupiter';

const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// DEX Program IDs for easy expansion
const DEX_PROGRAMS = {
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  METEORA: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  // Add more DEXs here as needed
};

export class TransactionParser {
  constructor(private connection: Connection) {}

  /**
   * Parse a transaction and extract swap information
   */
  async parseTransaction(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    try {
      const { transaction, meta, signature } = txData;

      if (!meta || !transaction.message) {
        return null;
      }

      // Check which DEX was used
      const dexUsed = this.detectDEX(transaction.message.accountKeys);

      // Try different parsing strategies based on DEX
      let swapInfo: SwapInfo | null = null;

      if (dexUsed === 'PUMP_FUN') {
        swapInfo = await this.parsePumpFunSwap(txData, walletAddress);
      } else if (dexUsed === 'RAYDIUM_V4' || dexUsed === 'RAYDIUM_CLMM') {
        swapInfo = await this.parseRaydiumSwap(txData, walletAddress);
      } else if (dexUsed === 'ORCA_WHIRLPOOL') {
        swapInfo = await this.parseOrcaSwap(txData, walletAddress);
      } else if (dexUsed === 'JUPITER_V6') {
        swapInfo = await this.parseJupiterSwap(txData, walletAddress);
      } else {
        // Fallback to generic token balance change detection
        swapInfo = await this.parseGenericSwap(txData, walletAddress);
      }

      return swapInfo;
    } catch (error) {
      console.error('Error parsing transaction:', error);
      return null;
    }
  }

  /**
   * Detect which DEX was used in the transaction
   */
  private detectDEX(accountKeys: string[]): string | null {
    for (const [dexName, programId] of Object.entries(DEX_PROGRAMS)) {
      if (accountKeys.includes(programId)) {
        return dexName;
      }
    }
    return null;
  }

  /**
   * Parse Pump.fun swaps (bonding curve)
   */
  private async parsePumpFunSwap(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    const { meta, signature } = txData;

    if (!meta?.preTokenBalances || !meta?.postTokenBalances) {
      return null;
    }

    // Find token balance changes
    const preBalances = meta.preTokenBalances;
    const postBalances = meta.postTokenBalances;

    // Calculate SOL change
    const solChange = meta.postBalances && meta.preBalances
      ? (meta.postBalances[0] - meta.preBalances[0]) / 1e9
      : 0;

    // Find token that changed
    let tokenMint: string | null = null;
    let tokenChange = 0;

    for (const postBalance of postBalances) {
      const preBalance = preBalances.find(
        (pre: any) => pre.accountIndex === postBalance.accountIndex
      );

      if (preBalance) {
        const diff = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0') -
                    parseFloat(preBalance.uiTokenAmount.uiAmountString || '0');
        
        if (Math.abs(diff) > 0.0001) {
          tokenMint = postBalance.mint;
          tokenChange = diff;
          break;
        }
      }
    }

    if (!tokenMint) {
      return null;
    }

    // Get token info
    const tokenInfo = await jupiterService.getTokenInfo(tokenMint);
    const tokenPrice = await jupiterService.getTokenPrice(tokenMint);
    const solPrice = await jupiterService.getTokenPrice(NATIVE_MINT.toBase58());

    // Determine buy or sell
    const isBuy = tokenChange > 0;
    
    if (isBuy) {
      // Bought tokens with SOL
      return {
        signature,
        timestamp: Date.now(),
        inputToken: {
          mint: NATIVE_MINT.toBase58(),
          symbol: 'SOL',
          name: 'Solana',
          amount: Math.abs(solChange * 1e9).toString(),
          uiAmount: Math.abs(solChange),
          decimals: 9,
          usdValue: solPrice ? Math.abs(solChange) * solPrice : undefined
        },
        outputToken: {
          mint: tokenMint,
          symbol: tokenInfo?.symbol || 'UNKNOWN',
          name: tokenInfo?.name || 'Unknown Token',
          amount: Math.abs(tokenChange * Math.pow(10, tokenInfo?.decimals || 9)).toString(),
          uiAmount: Math.abs(tokenChange),
          decimals: tokenInfo?.decimals || 9,
          usdValue: tokenPrice ? Math.abs(tokenChange) * tokenPrice : undefined
        },
        wallet: walletAddress
      };
    } else {
      // Sold tokens for SOL
      return {
        signature,
        timestamp: Date.now(),
        inputToken: {
          mint: tokenMint,
          symbol: tokenInfo?.symbol || 'UNKNOWN',
          name: tokenInfo?.name || 'Unknown Token',
          amount: Math.abs(tokenChange * Math.pow(10, tokenInfo?.decimals || 9)).toString(),
          uiAmount: Math.abs(tokenChange),
          decimals: tokenInfo?.decimals || 9,
          usdValue: tokenPrice ? Math.abs(tokenChange) * tokenPrice : undefined
        },
        outputToken: {
          mint: NATIVE_MINT.toBase58(),
          symbol: 'SOL',
          name: 'Solana',
          amount: Math.abs(solChange * 1e9).toString(),
          uiAmount: Math.abs(solChange),
          decimals: 9,
          usdValue: solPrice ? Math.abs(solChange) * solPrice : undefined
        },
        wallet: walletAddress
      };
    }
  }

  /**
   * Parse Raydium swaps
   * TODO: Implement Raydium-specific parsing
   */
  private async parseRaydiumSwap(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    // Raydium swaps can be parsed similarly to generic swaps
    return this.parseGenericSwap(txData, walletAddress);
  }

  /**
   * Parse Orca swaps
   * TODO: Implement Orca-specific parsing
   */
  private async parseOrcaSwap(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    // Orca swaps can be parsed similarly to generic swaps
    return this.parseGenericSwap(txData, walletAddress);
  }

  /**
   * Parse Jupiter aggregator swaps
   * TODO: Implement Jupiter-specific parsing
   */
  private async parseJupiterSwap(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    // Jupiter swaps can be parsed similarly to generic swaps
    return this.parseGenericSwap(txData, walletAddress);
  }

  /**
   * Generic swap parser using token balance changes
   */
  private async parseGenericSwap(
    txData: TransactionMessage,
    walletAddress: string
  ): Promise<SwapInfo | null> {
    const { meta, signature } = txData;

    if (!meta?.preTokenBalances || !meta?.postTokenBalances) {
      return null;
    }

    const preBalances = meta.preTokenBalances;
    const postBalances = meta.postTokenBalances;

    // Find all tokens that changed
    const changes: Array<{
      mint: string;
      change: number;
      decimals: number;
    }> = [];

    for (const postBalance of postBalances) {
      const preBalance = preBalances.find(
        (pre: any) => pre.accountIndex === postBalance.accountIndex
      );

      if (preBalance) {
        const diff = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0') -
                    parseFloat(preBalance.uiTokenAmount.uiAmountString || '0');
        
        if (Math.abs(diff) > 0.0001) {
          changes.push({
            mint: postBalance.mint,
            change: diff,
            decimals: postBalance.uiTokenAmount.decimals
          });
        }
      }
    }

    // Need at least 2 token changes for a swap
    if (changes.length < 2) {
      return null;
    }

    // Find input (negative change) and output (positive change)
    const input = changes.find(c => c.change < 0);
    const output = changes.find(c => c.change > 0);

    if (!input || !output) {
      return null;
    }

    // Get token info
    const [inputInfo, outputInfo] = await Promise.all([
      jupiterService.getTokenInfo(input.mint),
      jupiterService.getTokenInfo(output.mint)
    ]);

    const [inputPrice, outputPrice] = await Promise.all([
      jupiterService.getTokenPrice(input.mint),
      jupiterService.getTokenPrice(output.mint)
    ]);

    return {
      signature,
      timestamp: Date.now(),
      inputToken: {
        mint: input.mint,
        symbol: inputInfo?.symbol || 'UNKNOWN',
        name: inputInfo?.name || 'Unknown Token',
        amount: Math.abs(input.change * Math.pow(10, input.decimals)).toString(),
        uiAmount: Math.abs(input.change),
        decimals: input.decimals,
        usdValue: inputPrice ? Math.abs(input.change) * inputPrice : undefined
      },
      outputToken: {
        mint: output.mint,
        symbol: outputInfo?.symbol || 'UNKNOWN',
        name: outputInfo?.name || 'Unknown Token',
        amount: Math.abs(output.change * Math.pow(10, output.decimals)).toString(),
        uiAmount: Math.abs(output.change),
        decimals: output.decimals,
        usdValue: outputPrice ? Math.abs(output.change) * outputPrice : undefined
      },
      wallet: walletAddress
    };
  }

}