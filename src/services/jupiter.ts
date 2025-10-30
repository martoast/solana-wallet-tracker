import axios, { AxiosInstance } from 'axios';
import { JupiterTokenData } from '../types';
import { config } from '../config/env';

class JupiterService {
  private client: AxiosInstance;
  private tokenCache: Map<string, JupiterTokenData> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute

  constructor() {
    const baseURL = config.jupiterApiKey 
      ? 'https://api.jup.ag/ultra/v1'
      : 'https://lite-api.jup.ag/ultra/v1';

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: config.jupiterApiKey ? {
        'Authorization': `Bearer ${config.jupiterApiKey}`
      } : {}
    });
  }

  /**
   * Get token information from Jupiter
   */
  async getTokenInfo(mintAddress: string): Promise<JupiterTokenData | null> {
    // Check cache first
    if (this.tokenCache.has(mintAddress)) {
      return this.tokenCache.get(mintAddress)!;
    }

    try {
      const response = await this.client.get(`/search`, {
        params: { query: mintAddress }
      });

      if (response.data && response.data.length > 0) {
        const tokenData: JupiterTokenData = {
          id: response.data[0].id,
          name: response.data[0].name,
          symbol: response.data[0].symbol,
          decimals: response.data[0].decimals,
          icon: response.data[0].icon,
          usdPrice: response.data[0].usdPrice
        };

        this.tokenCache.set(mintAddress, tokenData);
        return tokenData;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching token info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Get token price with caching
   */
  async getTokenPrice(mintAddress: string): Promise<number | undefined> {
    const cached = this.priceCache.get(mintAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const tokenInfo = await this.getTokenInfo(mintAddress);
      if (tokenInfo?.usdPrice) {
        this.priceCache.set(mintAddress, {
          price: tokenInfo.usdPrice,
          timestamp: Date.now()
        });
        return tokenInfo.usdPrice;
      }
    } catch (error) {
      // Silent fail for price fetching
    }

    return undefined;
  }

  /**
   * Get holdings for a wallet address
   */
  async getWalletHoldings(address: string) {
    try {
      const response = await this.client.get(`/holdings/${address}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching holdings for ${address}:`, error);
      return null;
    }
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.tokenCache.clear();
    this.priceCache.clear();
  }
}

export const jupiterService = new JupiterService();