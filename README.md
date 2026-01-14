# Message With Tokens

A demo web app that teaches developers how XMTP messaging fees work by letting them experience the system firsthand.

## Quick Start

### Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (for running the XMTP Gateway)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Generate a payer private key for local development:

```bash
# Using cast (from foundry)
cast wallet new

# Or use any Ethereum wallet generator
```

Edit `.env.local` and set:
- `PAYER_PRIVATE_KEY` - Your generated private key
- `VITE_GATEWAY_PAYER_ADDRESS` - The address derived from your private key

### 3. Start the Gateway

```bash
docker-compose up -d
```

This runs the XMTP Gateway on `http://localhost:5050`.

### 4. Start the frontend

```bash
npm run dev
```

Open http://localhost:5173 to see the app.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Local Dev                             │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │   Frontend (Vite)    │    │   Gateway Service          │ │
│  │   localhost:5173     │───▶│   localhost:5050           │ │
│  │                      │    │   (Docker)                 │ │
│  └──────────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `docker-compose up -d` | Start gateway in background |
| `docker-compose down` | Stop gateway |
| `docker-compose logs -f` | View gateway logs |

## Environment Variables

See `.env.example` for all available environment variables.

### Frontend (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_GATEWAY_URL` | XMTP Gateway URL |
| `VITE_GATEWAY_PAYER_ADDRESS` | Address that pays for messages |
| `VITE_SETTLEMENT_CHAIN_RPC_URL` | Base Sepolia RPC |
| `VITE_MAINNET_RPC_URL` | Mainnet RPC (for ENS) |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |

### Gateway (Docker)

| Variable | Description |
|----------|-------------|
| `PAYER_PRIVATE_KEY` | Private key for the payer wallet |

## How Messaging Fees Work

1. **Apps pay, not users** - The gateway's payer wallet pays for all messages
2. **Deposit to fund** - Deposit mUSD to the payer's balance in PayerRegistry
3. **Per-message costs** - Each message costs based on payload size
4. **Shared balance** - Multiple users can send from the same payer balance

Fee formula:
```
cost = (messageFee + storageFee × bytes × days) × gasOverhead
```

Current testnet values:
- Base fee: ~$0.0000385 per message
- Storage: 22 picodollars per byte per day
- Default retention: 60 days
- Gas overhead: 1.25x

## Production Deployment (Railway)

Deploy this app to Railway for production use.

### Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- WalletConnect project ID

### Deploy Frontend

1. Create a new Railway project
2. Click "New Service" → "GitHub Repo"
3. Select this repository
4. Railway will auto-detect the `railway.toml` config

Set these environment variables:
```bash
VITE_GATEWAY_URL=https://<gateway-service>.railway.internal:5050
VITE_SETTLEMENT_CHAIN_RPC_URL=https://sepolia.base.org
VITE_APP_CHAIN_RPC_URL=https://xmtp-testnet.g.alchemy.com/public
VITE_MAINNET_RPC_URL=https://eth.llamarpc.com
VITE_WALLETCONNECT_PROJECT_ID=<your-project-id>
VITE_GATEWAY_PAYER_ADDRESS=<your-payer-address>
```

### Deploy Gateway

1. In the same Railway project, click "New Service" → "Docker Image"
2. Enter: `xmtp/xmtpd-gateway:main`
3. Set port to `5050`
4. Enable internal networking

Set these environment variables:
```bash
XMTPD_PAYER_PRIVATE_KEY=<your-payer-private-key>
```

### Fund the Production Payer

1. Copy your payer address (derived from the private key)
2. Get testnet ETH from a faucet (for gas)
3. Use the app's Faucet feature to mint mUSD
4. Deposit mUSD to fund messaging

### Railway Files

- `railway.toml` - Frontend deployment config
- `docker-compose.yml` - Local development only

### Internal Networking

Railway provides internal networking between services. Use the internal URL for the gateway:
- Internal: `https://<gateway-service>.railway.internal:5050`
- Public (if exposed): `https://<gateway-service>.up.railway.app`
