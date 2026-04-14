import { readTiltSnapshot } from "../lib/tilt-store";

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

export default async function handler(_: unknown, response: ApiResponse) {
  const snapshot = await readTiltSnapshot();

  response.status(200).json(snapshot);
}
