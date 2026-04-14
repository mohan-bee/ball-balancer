# Ball Balancer

Live gyroscope viewer with a 3D tray and rolling sphere.

## Local Development

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## Vercel Deployment

This repo is packed so it can deploy as a single Vercel project.

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Keep the default framework preset as `Other`.
4. Use `bun run build` as the build command.
5. Set the output directory to `public`.
6. Add a Redis integration from the Vercel Marketplace so the live tilt state can persist across requests.

The app reads the latest tilt state from `/api/state` and accepts updates at `/api/tilt`.

## Notes

- The 3D model is rendered from the bundled GLB assets in `web/models/`.
- The overlay uses a simple React bundle and Lucide icons.
- On local Bun dev, the WebSocket path still works. On Vercel, the UI falls back to the API polling flow.
