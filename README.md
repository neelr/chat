# chat.neelr.dev

Peer-to-peer encrypted chat running on Cloudflare Workers + Durable Objects.

Messages are sent directly between browsers via WebRTC data channels. The server only handles signaling (peer discovery, offer/answer/ICE relay) — it never sees message content.

Each client generates an ECDSA P-256 key pair on load. Messages are signed and verified so you know who sent what.

## Stack

- **Cloudflare Workers** — HTTP + WebSocket signaling server
- **Durable Objects** — manages WebSocket connections and peer state
- **WebRTC** — peer-to-peer data channels for chat messages
- **Web Crypto API** — ECDSA signing/verification

## Development

```bash
npm install
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```
