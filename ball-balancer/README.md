# Ball Balancer

Live gyroscope viewer with a 3D tray and rolling sphere.

## Local Development

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## How Pairing Works

- The receiver opens the app and gets a unique room id.
- The left panel shows a QR code for the transmitter.
- The QR encodes a join URL with `room=<id>&role=sensor`.
- The transmitter connects to the same room over WebSocket.
- The receiver and transmitter stay paired by that room id only.

## Build

```bash
bun run build
```

This bundles the browser entry points into `web/app.js` and `web/model-viewer.js`.

## Notes

- The server is websocket-only and runs from `server.ts`.
- The QR pairing flow is in `web/app-entry.tsx`.
- The 3D tray and ball viewer live in the `web/model-viewer/` modules.
