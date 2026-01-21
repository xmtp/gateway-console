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

The hosted version connects directly to the XMTP v3 dev network. You can:
1. Mint testnet tokens using the Faucet
2. Deposit funds to the gateway's payer balance
3. Create test users and send messages
4. See fee calculations and balance updates in real-time

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

---

## Experimental: Local Gateway Testing

> **Note:** Gateway integration is currently a work in progress. The demo and default configuration connect directly to the XMTP v3 dev network without routing through a gateway.

The XMTP Gateway Service allows apps to pay for user messages. While the gateway service exists and can be run locally, the SDK integration is still being finalized. Currently:

- **Default mode (`VITE_XMTP_NETWORK=dev`)**: Connects directly to XMTP dev network. Messages work, but aren't routed through your gateway.
- **Gateway mode (`VITE_XMTP_NETWORK=testnet`)**: Attempts to route through your gateway. This mode is experimental and may not work reliably yet.

### Testing the Gateway Locally

If you want to test the gateway integration locally:

#### 1. Generate TLS certificates

The XMTP SDK requires TLS when connecting through a gateway. Generate self-signed certs for local development:

```bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/localhost.key -out certs/localhost.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

#### 2. Configure environment

In `.env.local`, set:

```bash
# Enable gateway routing (experimental)
VITE_XMTP_NETWORK=testnet

# Gateway URL with HTTPS (required for TLS)
VITE_GATEWAY_URL=https://localhost:5050
```

#### 3. Start the gateway with TLS

The `docker-compose.yml` includes an Envoy proxy configured for TLS. With certs in place:

```bash
docker-compose up -d
```

This starts:
- **Redis** on port 6777
- **Gateway service** (internal)
- **Envoy proxy** on port 5050 with TLS termination

#### 4. Trust the certificate

Since the certificate is self-signed, you'll need to either:
- Visit `https://localhost:5050` in your browser and accept the security warning
- Add the certificate to your system's trusted certificates

#### 5. Verify gateway status

The app shows gateway connectivity status in the sidebar. When properly configured, it should show "Gateway Connected".

### Known Issues

- TLS channel mismatch errors may occur if the gateway URL protocol doesn't match the node URLs
- The SDK currently infers TLS settings from the gateway URL, which can cause issues with mixed configurations
- Gateway mode requires the gateway service to successfully connect to XMTP network nodes
