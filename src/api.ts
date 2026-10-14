import { Code, ConnectError, createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { DeliveryService } from "./gen/fastbite/v1/delivery_pb";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

// Browsers cannot speak native gRPC (they cannot control HTTP/2 frames), so
// they use the gRPC-Web variant. The backend understands both.
const transport = createGrpcWebTransport({ baseUrl: API_URL });

// A fully typed client generated from delivery.proto.
export const client = createClient(DeliveryService, transport);

/** Turns any thrown value into a message that is safe to show to a user. */
export function errorMessage(error: unknown): string {
  const err = ConnectError.from(error);
  if (err.code === Code.Unavailable) {
    return "Cannot reach the server. If it is hosted on a free plan it may be waking up; try again in a minute.";
  }
  return err.rawMessage || "Something went wrong.";
}

export function isCancellation(error: unknown): boolean {
  return ConnectError.from(error).code === Code.Canceled;
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const formatCop = (value: number): string => copFormatter.format(value);
