# Ball Balancer - Split Deployment

This project is split into two parts:
1. **Client**: Frontend to be deployed on Vercel.
2. **Server**: WebSocket backend to be deployed on Render.

## Deployment Instructions

### 1. Backend (Render)
- Deployed from the `server/` directory.
- **Environment**: Bun
- **Build Command**: `bun install`
- **Start Command**: `bun run start` (runs `server.ts`)
- **Port**: Render automatically provides `PORT`.

### 2. Frontend (Vercel)
- Deployed from the `client/` directory.
- **Framework**: Other (Static)
- **Build Command**: `bun run build`
- **Output Directory**: `.` (Current directory)
- **Note**: After deployment, copy your Render URL (e.g., `your-app.onrender.com`) and paste it into the "WebSocket host" field on the pairing screen.

## Local Development

```bash
# Start server
npm run server:dev

# Start client (in separate terminal)
npm run client:dev
```
