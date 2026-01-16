# XMTP Gateway Console

Learn how XMTP messaging fees work by using them.

## What It Does

A deployable messaging app that makes costs visible. Use the hosted version to understand XMTP's fee model, or deploy your own to validate your gateway payment setup—all with testnet tokens.

## When to Use It

- Understanding XMTP's fee model
- Testing your gateway payment setup before integrating into your app

## Why Use It

XMTP uses an "apps pay, not users" model—your app covers messaging costs, not your users. This console shows you exactly what that means in practice: real messages, real fee breakdowns, and a real gateway setup you can validate before you ship.

---

## Try It Now

Visit the [live demo](https://xmtp-gateway-console.up.railway.app/)—no setup required.

The hosted version connects to a shared gateway. You can:
1. Mint testnet tokens using the Faucet
2. Deposit funds to the gateway's payer balance
3. Create test users and send messages
4. Watch the gateway pay for each message in real-time

---

## Setup

Run your own instance to validate your gateway payment setup before integrating into your app.

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Dev                               │
│  ┌──────────────────────┐      ┌────────────────────────────┐  │
│  │   Frontend (Vite)    │      │   Gateway Service          │  │
│  │   localhost:5173     │─────▶│   localhost:5050           │  │
│  │   XMTP Client        │      │   (Docker)                 │  │
│  └──────────────────────┘      └────────────────────────────┘  │
│                                           │                     │
│                                           ▼                     │
│                               ┌────────────────────────────┐   │
│                               │   Payer Registry           │   │
│                               │   (Base Sepolia)           │   │
│                               └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- **Frontend** – This React app. It includes the XMTP client that sends messages through your gateway.
- **Gateway** – A service you run that holds your payer wallet's private key and signs payment transactions on every message.
- **Payer Wallet** – An Ethereum wallet that pays for all messages your app sends. Your users never pay—you do.
- **Payer Registry** – A smart contract on Base Sepolia that holds your balance. The gateway draws from it with each message sent.

When you deploy locally, you run the Frontend and Gateway. The Payer Registry already exists on-chain—you just fund it.

### Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (for running the Gateway)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Generate a payer wallet:

```bash
# Using cast (from Foundry)
cast wallet new

# Or use any Ethereum wallet generator
```

Edit `.env.local`:

| Variable | Value |
|----------|-------|
| `XMTPD_PAYER_PRIVATE_KEY` | Your generated private key |
| `VITE_GATEWAY_PAYER_ADDRESS` | The address derived from your private key |
| `XMTPD_SETTLEMENT_CHAIN_RPC_URL` | Base Sepolia RPC URL ([get from Alchemy](https://www.alchemy.com/)) |
| `XMTPD_SETTLEMENT_CHAIN_WSS_URL` | Base Sepolia WebSocket URL |

### 3. Start the Gateway

```bash
git clone https://github.com/xmtp/gateway-service-example.git gateway-service
docker-compose up -d
```

The Gateway runs on `http://localhost:5050`.

### 4. Start the Frontend

```bash
npm run dev
```

Open http://localhost:5173.

### 5. Fund your payer

Before sending messages, fund your payer wallet:

1. Use the **Faucet** to mint testnet mUSD
2. Use **Deposit** to add funds to your payer balance in the Payer Registry

---

## Usage

### Send Your First Message

1. **Create a test user** – Click "Add User" to generate an ephemeral wallet, or connect your own wallet.

2. **Fund the payer** – Before sending, your gateway needs funds:
   - Click **Faucet** to mint testnet mUSD
   - Click **Deposit** to add funds to your payer balance

3. **Start a conversation** – Click "New Conversation" and enter another user's address. You can create a second test user to message yourself.

4. **Send a message** – Type and send. Watch the cost display update as you type, then see the fee deducted after sending.

5. **Check the balance** – The header shows your remaining payer balance and estimated messages remaining.

### Fee Breakdown

As you type, the console calculates message cost using XMTP's fee formula:

```
cost = (messageFee + storageFee × bytes × days) × gasOverhead
```

| Component | Current Testnet Value |
|-----------|----------------------|
| Base message fee | ~$0.0000385 |
| Storage fee | 22 picodollars/byte/day |
| Default retention | 60 days |
| Gas overhead | 1.25× |

Longer messages cost more (more bytes to store). The cost display updates in real-time as your message length changes.

### Dual Fee Model

XMTP uses two types of fees, each paid from a separate balance:

**Message Fees (Payer Registry)**

Paid from your mUSD balance on Base Sepolia. These cover:
- Sending messages
- Message storage (bytes × days × rate)

**Gas Fees (XMTP Appchain)**

Paid from your xUSD gas reserve on the XMTP Appchain (L3). These cover:
- Creating groups
- Adding/removing group members
- Updating group metadata
- Linking/unlinking wallets to identity

When you deposit funds, they're automatically split: 75% goes to your messaging balance, 25% to your gas reserve. Both balances are displayed in the sidebar with operation estimates.

The deposit preview shows exactly how your funds will be allocated before you confirm.

---

## Deploy to Railway

Deploy your own instance to production.

### 1. Deploy the Frontend

1. Create a new Railway project
2. Click **New Service** → **GitHub Repo** and select this repository
3. Set environment variables:

```
VITE_GATEWAY_URL=https://<gateway-service>.railway.internal:5050
VITE_GATEWAY_PAYER_ADDRESS=<your-payer-address>
VITE_WALLETCONNECT_PROJECT_ID=<your-project-id>
```

### 2. Deploy the Gateway

1. In the same project, click **New Service** → **Docker Image**
2. Enter: `xmtp/xmtpd-gateway:main`
3. Set port to `5050` and enable internal networking
4. Set environment variable:

```
XMTPD_PAYER_PRIVATE_KEY=<your-payer-private-key>
```

### 3. Fund your payer

1. Get testnet ETH from a [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Use the app's Faucet to mint mUSD
3. Deposit mUSD to fund messaging
