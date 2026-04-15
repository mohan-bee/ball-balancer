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

    // Health check or simple root message
    if (url.pathname === "/health") {
      return new Response("OK");
    }

    if (serverInstance.upgrade(request, { data: upgradeDataFromUrl(url) })) {
      return;
    }

    return new Response("This is a WebSocket server. Connect via WS/WSS.", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },
  websocket: {
    open(socket: ServerWebSocket<SocketData>) {
      const room = getRoom(socket.data.roomId);

      if (socket.data.role === "sensor") {
        if (room.sensor && room.sensor !== socket) {
          room.sensor.close();
        }
        room.sensor = socket;
        if (
          room.latestState.x === 0 &&
          room.latestState.z === 0 &&
          room.lastRawMessage === "No sensor packet received yet."
        ) {
          room.lastRawMessage = JSON.stringify({
            type: "tilt",
            x: 0,
            z: 0,
          });
        }
        broadcastRoom(socket.data.roomId, room);
      } else {
        room.viewers.add(socket);
      }

      socket.send(JSON.stringify(getPayload(socket.data.roomId, room)));
    },
    message(socket: ServerWebSocket<SocketData>, message) {
      const rawMessage = decodeMessage(message);
      const parsed = parseClientMessage(rawMessage);
      const room = getRoom(socket.data.roomId);

      if (!parsed) {
        return;
      }

      if (parsed.type === "viewer") {
        socket.data.role = "viewer";
        room.viewers.add(socket);
        socket.send(JSON.stringify(getPayload(socket.data.roomId, room)));
        return;
      }

      socket.data.role = "sensor";
      room.sensor = socket;
      room.lastRawMessage = rawMessage;
      room.latestState = createTiltState(parsed.x, parsed.z);
      broadcastRoom(socket.data.roomId, room);
    },
    close(socket: ServerWebSocket<SocketData>) {
      const room = rooms.get(socket.data.roomId);
      if (!room) {
        return;
      }

      if (socket.data.role === "sensor" && room.sensor === socket) {
        room.sensor = null;
      }

      room.viewers.delete(socket);
      deleteRoomIfEmpty(socket.data.roomId, room);
    },
  },
});

console.log(`> WebSocket Server ready on port ${server.port}`);
