# Ball Balancer

Single project deployment containing both the 3D frontend and the WebSocket backend.

## Deployment on Render

1. **Connect Repository**: Create a new "Web Service" on [Render](https://render.com/).
2. **Environment**: Select **Bun** (or use Docker if preferred, but Bun is faster).
3. **Build Command**: `bun install && bun run build`
4. **Start Command**: `bun run start` (runs `server.ts`)
5. **Port**: Render automatically detects the port (defaults to 3000 if not provided).

## Local Development

```bash
bun install
bun run build
bun dev
```

Open `http://localhost:3000`.

## How it Works

- The server (`server.ts`) serves the static frontend from the `web/` directory.
- The same server handles WebSocket connections for real-time sensor data.
- The pairing logic uses a unique room ID passed via QR code.
