import { useEffect, useState } from "react";
import { client, errorMessage, isCancellation } from "./api";
import { OrderStatus, type OrderUpdate } from "./gen/fastbite/v1/delivery_pb";

interface TrackerProps {
  orderId: string;
  onNewOrder: () => void;
}

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: OrderStatus.PLACED, label: "Placed", emoji: "📝" },
  { status: OrderStatus.PREPARING, label: "Preparing", emoji: "👨‍🍳" },
  { status: OrderStatus.ON_THE_WAY, label: "On the way", emoji: "🛵" },
  { status: OrderStatus.DELIVERED, label: "Delivered", emoji: "🏠" },
];

const isFinal = (status: OrderStatus) =>
  status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;

export function Tracker({ orderId, onNewOrder }: TrackerProps) {
  const [update, setUpdate] = useState<OrderUpdate | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Open ONE server-streaming gRPC call for this order. The server pushes a
  // message whenever something changes; we just read them in a loop.
  useEffect(() => {
    const controller = new AbortController();
    setUpdate(null);
    setLog([]);
    setError(null);

    (async () => {
      try {
        for await (const next of client.trackOrder({ orderId }, { signal: controller.signal })) {
          setUpdate(next);
          const time = new Date(Number(next.timestampMs)).toLocaleTimeString();
          setLog((previous) => [`${time}  ${next.message}`, ...previous].slice(0, 8));
        }
      } catch (err) {
        if (!isCancellation(err)) setError(errorMessage(err));
      }
    })();

    // When the component goes away, abort the call: the server stops streaming.
    return () => controller.abort();
  }, [orderId]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await client.cancelOrder({ orderId });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  const status = update?.status ?? OrderStatus.UNSPECIFIED;
  const cancelled = status === OrderStatus.CANCELLED;
  const canCancel = status === OrderStatus.PLACED || status === OrderStatus.PREPARING;
  const currentStep = STEPS.findIndex((step) => step.status === status);
  const progress = update?.routeProgress ?? 0;

  return (
    <section className="card" aria-live="polite">
      <div className="card-header">
        <h2>Order #{orderId}</h2>
        {update && !isFinal(status) && (
          <span className="eta">ETA {update.etaSeconds}s</span>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {!update && !error && <p className="muted">Connecting to live tracking…</p>}

      {update && (
        <>
          {cancelled ? (
            <p className="banner banner-cancelled">❌ This order was cancelled.</p>
          ) : (
            <ol className="steps">
              {STEPS.map((step, index) => (
                <li
                  key={step.label}
                  className={index < currentStep ? "done" : index === currentStep ? "current" : ""}
                >
                  <span className="step-emoji">{step.emoji}</span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ol>
          )}

          {!cancelled && (
            <div className="route" aria-label={`Courier route progress ${Math.round(progress * 100)}%`}>
              <span>🍽️</span>
              <div className="route-line">
                <div className="route-fill" style={{ width: `${progress * 100}%` }} />
                <span className="courier" style={{ left: `${progress * 100}%` }}>🛵</span>
              </div>
              <span>🏠</span>
            </div>
          )}

          <p className="message">{update.message}</p>

          <details className="log" open>
            <summary>Messages received through the stream</summary>
            <ul>
              {log.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          </details>
        </>
      )}

      <div className="actions">
        {canCancel && (
          <button className="secondary" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        )}
        {(isFinal(status) || error) && (
          <button onClick={onNewOrder}>Make another order</button>
        )}
      </div>
    </section>
  );
}
