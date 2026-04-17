declare module "ws" {
  export type RawData = string | ArrayBuffer | Buffer | Buffer[];

  export class WebSocket {
    static readonly OPEN: number;
    readonly OPEN: number;
    readyState: number;
    send(data: string): void;
    on(event: "message", listener: (data: RawData) => void): this;
  }

  export class WebSocketServer {
    clients: Set<WebSocket>;

    constructor(options: { noServer: true });

    on(event: "connection", listener: (socket: WebSocket) => void): this;
    handleUpgrade(
      request: unknown,
      socket: unknown,
      head: Buffer,
      callback: (socket: WebSocket) => void,
    ): void;
    emit(event: "connection", socket: WebSocket, request: unknown): boolean;
  }
}
