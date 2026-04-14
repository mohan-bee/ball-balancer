import {
  createInitialTiltState,
  createTiltState,
  parseClientMessage,
  type TiltState,
} from "./lib/tilt";

const port = Number(process.env.PORT ?? 3000);
let latestState: TiltState = createInitialTiltState();
let lastRawMessage = "No sensor packet received yet.";
const viewers = new Set<ServerWebSocket<{ role: "unknown" | "viewer" | "sensor" }>>();
const assetFiles = {
  "/": {
    file: Bun.file(`${process.cwd()}/web/index.html`),
    contentType: "text/html; charset=utf-8",
  },
  "/styles.css": {
    file: Bun.file(`${process.cwd()}/web/styles.css`),
    contentType: "text/css; charset=utf-8",
  },
  "/app.js": {
    file: Bun.file(`${process.cwd()}/web/app.js`),
    contentType: "text/javascript; charset=utf-8",
  },
  "/model-viewer.js": {
    file: Bun.file(`${process.cwd()}/web/model-viewer.js`),
    contentType: "text/javascript; charset=utf-8",
  },
  "/models/scene.glb": {
    file: Bun.file(`${process.cwd()}/web/models/scene.glb`),
    contentType: "model/gltf-binary",
  },
} as const;

function decodeMessage(message: string | Buffer | ArrayBuffer | Uint8Array): string {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(message));
  }

  if (message instanceof Uint8Array) {
    return new TextDecoder().decode(message);
  }

  return message.toString();
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch(request, serverInstance) {
    if (serverInstance.upgrade(request, { data: { role: "unknown" } })) {
      return;
    }

    const pathname = new URL(request.url).pathname;
    const asset = assetFiles[pathname as keyof typeof assetFiles];

    if (asset) {
      return new Response(asset.file, {
        headers: {
          "content-type": asset.contentType,
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },
  websocket: {
    open(socket) {
      socket.send(JSON.stringify(latestState));
    },
    message(socket, message) {
      const rawMessage = decodeMessage(message);
      lastRawMessage = rawMessage;
      const parsed = parseClientMessage(rawMessage);

      if (!parsed) {
        if (socket.data.role === "viewer") {
          socket.send(
            JSON.stringify({
              ...latestState,
              readout: `${latestState.readout}\n\nLast raw packet:\n${lastRawMessage}`,
            }),
          );
        }
        return;
      }

      if (parsed.type === "viewer") {
        socket.data.role = "viewer";
        viewers.add(socket);
        socket.send(
          JSON.stringify({
            ...latestState,
            readout: `${latestState.readout}\n\nLast raw packet:\n${lastRawMessage}`,
          }),
        );
        return;
      }

      socket.data.role = "sensor";
      latestState = createTiltState(parsed.x, parsed.z);
      const serializedState = JSON.stringify(latestState);

      for (const client of viewers) {
        client.send(serializedState);
      }
    },
    close(socket) {
      viewers.delete(socket);
    },
  },
});

console.log(`> Ready on http://${server.hostname}:${server.port}`);
