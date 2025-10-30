# 🚀 Solana Wallet Tracker - Jupiter Edition

A professional, real-time Solana wallet transaction tracker built with TypeScript and Jupiter's Ultra API. Monitor any wallet's swap transactions with beautiful terminal output.

## ✨ Features

- 🔄 **Real-time Transaction Monitoring** - WebSocket-based live tracking
- 💎 **Jupiter Integration** - Token data and pricing via Jupiter Ultra API
- 🎨 **Beautiful Terminal UI** - Color-coded, formatted output
- 💰 **USD Value Tracking** - Automatic price conversion
- 🔒 **Safe & Clean** - No private keys required, read-only monitoring
- ⚡ **Multi-Wallet Support** - Track multiple wallets simultaneously
- 🎯 **Smart Filtering** - Filter by minimum transaction value

## 📋 Prerequisites

- Node.js 18+ or Bun
- A Solana RPC endpoint (free tier works, paid recommended for production)
- (Optional) Jupiter API key for higher rate limits

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Create project directory
mkdir solana-wallet-tracker
cd solana-wallet-tracker

# Copy all files from the artifacts
# (package.json, tsconfig.json, src/, etc.)

# Install dependencies
npm install
# or
bun install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required configuration:
```env
# Use free public RPC or paid provider (Helius, Triton, etc.)
SOLANA_RPC_HTTP=https://api.mainnet-beta.solana.com
SOLANA_RPC_WS=wss://api.mainnet-beta.solana.com

# Wallet address(es) to track (comma-separated)
TRACKED_WALLETS=7otFaEnNzz9SnxHD7RGGxtW3gqgQeN3bjwU9muQP2rzp

# Optional: Jupiter API key for higher rate limits
# JUPITER_API_KEY=your_key_here

# Optional: Minimum swap value to display (in USD)
MIN_SWAP_VALUE_USD=1
```

### 3. Run

```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build
npm start
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