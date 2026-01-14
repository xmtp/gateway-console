# fn-1.11 Local Gateway Docker Setup

## Description

Set up local Gateway Service for development. This is required early to enable testing of XMTP client functionality.

**IMPORTANT**: This task should be completed early (after fn-1.1) to unblock XMTP testing.

### Gateway Service

Docker image: `xmtp/xmtpd-gateway:main`

```bash
# Run gateway locally
docker run -p 5050:5050 -p 5055:5055 \
  -e XMTPD_PAYER_PRIVATE_KEY=$PAYER_KEY \
  xmtp/xmtpd-gateway:main
```

### Payer Key Generation

Generate a test payer key for local development:

```bash
# Generate new key (or use existing testnet key)
cast wallet new
# Fund via faucet if needed
```

### Docker Compose (Local Dev)

```yaml
version: '3'
services:
  gateway:
    image: xmtp/xmtpd-gateway:main
    ports:
      - "5050:5050"
      - "5055:5055"
    environment:
      - XMTPD_PAYER_PRIVATE_KEY=${PAYER_KEY}
```

### Environment Variables

Create `.env.local`:
```bash
VITE_GATEWAY_URL=http://localhost:5050
PAYER_KEY=0x...  # Your test payer private key
```

### Derive Payer Address

The gateway's payer address (for deposits) is derived from the private key:

```typescript
import { privateKeyToAccount } from 'viem/accounts';
const GATEWAY_PAYER_ADDRESS = privateKeyToAccount(PAYER_KEY).address;
```

This address should be displayed in the app and is where deposits are sent.

### Reference

- XMTP Gateway docs: https://docs.xmtp.org/fund-agents-apps/run-gateway

## Acceptance

- [ ] Gateway runs locally via `docker run` command
- [ ] Gateway runs via docker-compose.yml
- [ ] Frontend can connect to local gateway (test with simple fetch)
- [ ] Payer private key documented in .env.example
- [ ] Payer address derivation utility created
- [ ] README documents local development setup

## Done summary
Set up local Gateway Service for development with Docker Compose.

Key accomplishments:
- Created docker-compose.yml with xmtp/xmtpd-gateway:main image
- Created src/lib/payer.ts with payer address derivation utility
- Updated README with comprehensive local development setup
- Documented environment variables and commands
- Gateway configured for ports 5050 (gRPC) and 5055 (HTTP)
## Evidence
- Commits:
- Tests:
- PRs: