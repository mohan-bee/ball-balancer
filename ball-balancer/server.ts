import {
  createInitialTiltState,
  createTiltState,
  parseClientMessage,
  type TiltState,
} from "./lib/tilt";

type SocketRole = "unknown" | "viewer" | "sensor";
type SocketData = {
  roomId: string;
  role: SocketRole;
};

type RoomState = {
  latestState: TiltState;
  lastRawMessage: string;
  viewers: Set<ServerWebSocket<SocketData>>;
  sensor: ServerWebSocket<SocketData> | null;
};

const port = Number(process.env.PORT ?? 3000);
const rooms = new Map<string, RoomState>();

// Asset map for clean serving
const assetFiles: Record<string, { path: string; contentType: string }> = {
  "/": { path: "./web/index.html", contentType: "text/html; charset=utf-8" },
  "/styles.css": { path: "./web/styles.css", contentType: "text/css; charset=utf-8" },
  "/app.js": { path: "./web/app.js", contentType: "text/javascript; charset=utf-8" },
  "/model-viewer.js": { path: "./web/model-viewer.js", contentType: "text/javascript; charset=utf-8" },
  "/models/scene.glb": { path: "./web/models/scene.glb", contentType: "model/gltf-binary" },
};

function createRoom(): RoomState {
  return {
    latestState: createInitialTiltState(),
    lastRawMessage: "No sensor packet received yet.",
    viewers: new Set(),
    sensor: null,
  };
}

function getRoom(roomId: string): RoomState {
  const existing = rooms.get(roomId);

  if (existing) {
    return existing;
  }

  const created = createRoom();
  rooms.set(roomId, created);
  return created;
}

function deleteRoomIfEmpty(roomId: string, room: RoomState) {
  if (room.viewers.size === 0 && room.sensor === null) {
    rooms.delete(roomId);
  }
}

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

function getPayload(roomId: string, room: RoomState) {
  return {
    ...room.latestState,
    roomId,
    lastRawMessage: room.lastRawMessage,
  };
}

function broadcastRoom(roomId: string, room: RoomState) {
  const payload = JSON.stringify(getPayload(roomId, room));

  for (const viewer of room.viewers) {
    viewer.send(payload);
  }
}

function upgradeDataFromUrl(url: URL): SocketData {
  const roomId = url.searchParams.get("room") || crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const role = url.searchParams.get("role") === "sensor" ? "sensor" : "viewer";

  return {
    roomId,
    role,
  };
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch(request, serverInstance) {
    const url = new URL(request.url);

    // 1. WebSocket Upgrade check (Priority)
    if (serverInstance.upgrade(request, { data: upgradeDataFromUrl(url) })) {
      return;
    }

    // 2. Static Asset serving
    const asset = assetFiles[url.pathname];
    if (asset) {
      return new Response(Bun.file(asset.path), {
        headers: { "Content-Type": asset.contentType },
      });
    }

    // 3. SPA Fallback / Health check
    if (url.pathname === "/health") return new Response("OK");
    
    // Serve index.html for unknown paths to support client-side routing
    if (request.method === "GET") {
      const indexPath = assetFiles["/"].path;
      return new Response(Bun.file(indexPath), {
        headers: { "Content-Type": assetFiles["/"].contentType },
      });
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(socket: ServerWebSocket<SocketData>) {
      const room = getRoom(socket.data.roomId);
      console.log(`[WS] Open: Room ${socket.data.roomId} as ${socket.data.role}`);

      if (socket.data.role === "sensor") {
        if (room.sensor && room.sensor !== socket) {
          room.sensor.close();
        }
        room.sensor = socket;
        broadcastRoom(socket.data.roomId, room);
      } else {
        room.viewers.add(socket);
      }

      socket.send(JSON.stringify(getPayload(socket.data.roomId, room)));
    },
    message(socket: ServerWebSocket<SocketData>, message) {
      const rawMessage = decodeMessage(message);
      const parsed = parseClientMessage(rawMessage);
      if (!parsed) return;

      const room = getRoom(socket.data.roomId);
      if (parsed.type === "viewer") {
        socket.data.role = "viewer";
        room.viewers.add(socket);
        socket.send(JSON.stringify(getPayload(socket.data.roomId, room)));
      } else {
        socket.data.role = "sensor";
        room.sensor = socket;
        room.lastRawMessage = rawMessage;
        room.latestState = createTiltState(parsed.x, parsed.z);
        broadcastRoom(socket.data.roomId, room);
      }
    },
    close(socket: ServerWebSocket<SocketData>) {
      console.log(`[WS] Close: Room ${socket.data.roomId}`);
      const room = rooms.get(socket.data.roomId);
      if (!room) return;

      if (socket.data.role === "sensor" && room.sensor === socket) {
        room.sensor = null;
      }

      room.viewers.delete(socket);
      deleteRoomIfEmpty(socket.data.roomId, room);
    },
  },
});

console.log(`> Server running on http://localhost:${server.port}`);
