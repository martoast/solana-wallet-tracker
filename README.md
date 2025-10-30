# 🚀 Solana Wallet Tracker V2 - Performance Analytics Edition

A professional, real-time Solana wallet transaction tracker with **performance analytics** and **P&L tracking**. Monitor any wallet's trades and see exactly how profitable their strategy is!

## ✨ V2 Features

### 🎯 Performance Tracking
- **Real-time P&L Calculation** - Automatic profit/loss tracking for every trade
- **Win Rate Analytics** - See how many trades are profitable
- **Position Management** - Track open positions with unrealized P&L
- **Portfolio Simulation** - See what your portfolio would look like if you copied their trades
- **Trade History** - Complete history of all buys and sells

### 📊 Smart Analytics
- **ROI Tracking** - Return on investment calculations
- **Average Buy Price** - Track cost basis for each position
- **Realized vs Unrealized P&L** - Separate closed trades from open positions
- **Performance Dashboard** - Auto-updates every 60 seconds

### 🎨 Enhanced Display
- **Token Swap Focus** - Filter to show only meaningful trades (SOL ↔ Token)
- **Trade Type Detection** - Clear BUY 📥 and SELL 📤 indicators
- **P&L Visualization** - Color-coded profits (green) and losses (red)
- **Beautiful Terminal UI** - Professional, easy-to-read output

## 📋 Prerequisites

- Node.js 18+ or Bun
- A Solana RPC endpoint (Helius recommended for best performance)
- (Optional) Jupiter API key for higher rate limits

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Important Configuration:**
```env
# Your Helius RPC (required for best performance)
SOLANA_RPC_HTTP=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_WS=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Wallet to track (find active traders on pump.fun or birdeye.so)
TRACKED_WALLETS=FCSsZQNhA9LmDW9D4tcLXgi4BkY3Bz8kjUqTYoNTaqu9

# Enable performance tracking (highly recommended!)
TRACK_PERFORMANCE=true

# Show only token swaps (filters out transfers and noise)
SHOW_ONLY_TOKEN_SWAPS=true

# Minimum value to display
MIN_SWAP_VALUE_USD=1
```

### 3. Run

```bash
npm run dev
```

## 📊 What You'll See

### Trade Notifications

```
════════════════════════════════════════════════════════════════════
📥 BUY DETECTED - PUMP.FUN
════════════════════════════════════════════════════════════════════
👛 Wallet: FCSsZQNh...YoNTaqu9
⏰ Time: 10/29/2025, 11:45:00 PM

💸 SPENT:
  Amount: 0.5000 SOL
  Value: $97.00

🎯 RECEIVED:
  Token: BONK (Bonk)
  Amount: 125.00K BONK
  Value: $100.25
  Price: 0.00000400 SOL per BONK

🔗 Transaction: https://solscan.io/tx/...
════════════════════════════════════════════════════════════════════
```

### Performance Dashboard (Auto-updates every 60s)

```
═══════════════════════════════════════════════════════════════════
📊 WALLET PERFORMANCE DASHBOARD
═══════════════════════════════════════════════════════════════════
👛 Wallet: FCSsZQNh...YoNTaqu9

📈 OVERALL STATS
  Total Trades: 47
  Win Rate: +68.42%
  Winning Trades: 26
  Losing Trades: 12

💰 PROFIT & LOSS
  Realized P&L: +2.4567 SOL
  Unrealized P&L: +1.2345 SOL
  Total P&L: +3.6912 SOL
  ROI: +147.65%

🎯 OPEN POSITIONS (3)
  BONK:
    Balance: 125000.0000 BONK
    Avg Price: 0.000004 SOL
    Invested: 0.5000 SOL
    Current: 0.7500 SOL
    P&L: +0.2500 SOL (+50.00%)
    
  GIGI:
    Balance: 50000.0000 GIGI
    Invested: 0.3000 SOL
    P&L: +0.1200 SOL (+40.00%)

📋 RECENT TRADES (Last 5)
  📤 SELL BONK
    Amount: 50.00K BONK
    Price: 0.00000600 SOL
    P&L: +0.1000 SOL (+50.00%)
    Time: 10/29/2025, 11:40:15 PM
    
  📥 BUY GIGI
    Amount: 50.00K GIGI
    Price: 0.00000600 SOL
    Time: 10/29/2025, 11:35:22 PM
═══════════════════════════════════════════════════════════════════
```

## 📁 Project Structure

```
solana-wallet-tracker/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── services/
│   │   ├── websocket.ts        # WebSocket connection handler
│   │   ├── jupiter.ts          # Jupiter API integration
│   │   └── parser.ts           # Transaction parser
│   ├── utils/
│   │   └── logger.ts           # Terminal output formatter
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   └── index.ts                # Main entry point
├── .env                        # Configuration (create from .env.example)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Usage Examples

### Track a Single Wallet

```env
TRACKED_WALLETS=7otFaEnNzz9SnxHD7RGGxtW3gqgQeN3bjwU9muQP2rzp
```

### Track Multiple Wallets

```env
TRACKED_WALLETS=wallet1...,wallet2...,wallet3...
```

### Filter Small Transactions

```env
MIN_SWAP_VALUE_USD=100  # Only show swaps > $100
```

### Use Premium RPC (Recommended)

```env
# Helius example
SOLANA_RPC_HTTP=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_WS=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Triton example
SOLANA_RPC_HTTP=https://your-endpoint.rpcpool.com/YOUR_KEY
SOLANA_RPC_WS=wss://your-endpoint.rpcpool.com/YOUR_KEY
```

## 📊 Output Example

```
╔═══════════════════════════════════════════════════════════════════════════╗
║           🚀 SOLANA WALLET TRACKER - JUPITER EDITION 🚀              ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 Status: ACTIVE
👛 Tracking Wallets:
   1. 7otFaEnN...muQP2rzp

⏳ Waiting for transactions...

════════════════════════════════════════════════════════════════════════════════
🔄 NEW SWAP DETECTED
════════════════════════════════════════════════════════════════════════════════
👛 Wallet: 7otFaEnN...muQP2rzp
⏰ Time: 10/29/2025, 3:45:22 PM

📤 SOLD:
  Token: SOL (Solana)
  Amount: 0.5000 SOL
  Value: $82.50
  Mint: So111111...111112

📥 BOUGHT:
  Token: BONK (Bonk)
  Amount: 125000.0000 BONK
  Value: $85.25
  Mint: DezXAcq...pMmJ

🔗 Transaction:
  https://solscan.io/tx/5j7s8...9Kp2
════════════════════════════════════════════════════════════════════════════════
```

## 🔧 Advanced Configuration

### Custom RPC Endpoints

For production use, we recommend using paid RPC providers:

- **[Helius](https://helius.dev/)** - Excellent for WebSocket reliability
- **[Triton](https://triton.one/)** - High-performance endpoints
- **[QuickNode](https://quicknode.com/)** - Easy setup

### Jupiter API Key

Get higher rate limits with a Jupiter API key:

1. Visit [Jupiter](https://jup.ag/)
2. Request API access
3. Add to `.env`: `JUPITER_API_KEY=your_key`

## 🛡️ Security Notes

- **Read-Only**: This tracker only reads blockchain data
- **No Private Keys**: Never requires or stores private keys
- **No Transactions**: Does not execute any transactions
- **Safe to Use**: Monitors public blockchain data only

## 🐛 Troubleshooting

### "WebSocket connection closed"

- Check your RPC endpoint is correct
- Verify WebSocket URL uses `wss://` protocol
- Consider upgrading to paid RPC for better reliability

### "No transactions showing"

- Verify wallet address is correct
- Check if wallet has recent swap activity
- Lower `MIN_SWAP_VALUE_USD` threshold
- Wait a few minutes for new transactions

### Rate Limiting

- Use paid RPC provider for production
- Add Jupiter API key for token data
- Reduce number of tracked wallets

## 📝 Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Clean build artifacts
npm run clean
```

## 🤝 Contributing

This is a clean, production-ready implementation. Feel free to:

- Add more DEX support
- Enhance filtering options
- Add database logging
- Create a web dashboard
- Add notifications (Discord, Telegram, etc.)

## 📄 License

MIT License - feel free to use and modify!

## ⚠️ Disclaimer

This tool is for informational purposes only. Always do your own research before making any trading decisions. Past performance does not guarantee future results.

---

Built with ❤️ using TypeScript, Solana, and Jupiter