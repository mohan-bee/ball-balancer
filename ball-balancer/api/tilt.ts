import { writeTiltSnapshot } from "../lib/tilt-store";
import { formatTiltMessage, parseClientMessage } from "../lib/tilt";
import type { IncomingMessage } from "http";

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

type TiltRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
};

async function readJsonBody(request: TiltRequest): Promise<unknown> {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
  }

  const text = new TextDecoder().decode(Buffer.concat(chunks));
  return text ? JSON.parse(text) : {};
}

export default async function handler(request: TiltRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const parsed =
      body && typeof body === "object" && "type" in body
        ? parseClientMessage(JSON.stringify(body))
        : null;

    if (!parsed || parsed.type !== "tilt") {
      response.status(400).json({ error: "Invalid tilt payload" });
      return;
    }

    const snapshot = await writeTiltSnapshot(
      parsed.x,
      parsed.z,
      formatTiltMessage(parsed.x, parsed.z),
    );

    response.status(200).json(snapshot);
  } catch (error) {
    console.error(error);
    response.status(400).json({ error: "Invalid request body" });
  }
}
