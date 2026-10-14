import { useEffect, useMemo, useState, type FormEvent } from "react";
import { client, errorMessage, formatCop } from "./api";
import type { MenuItem } from "./gen/fastbite/v1/delivery_pb";
import { Tracker } from "./Tracker";

export function App() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Unary gRPC call: ask the server for the menu once when the page loads.
  useEffect(() => {
    let cancelled = false;
    setLoadingMenu(true);
    setMenuError(null);
    client
      .listMenu({})
      .then((response) => {
        if (!cancelled) setMenu(response.items);
      })
      .catch((error) => {
        if (!cancelled) setMenuError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingMenu(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cartLines = useMemo(
    () =>
      menu
        .filter((item) => (quantities[item.id] ?? 0) > 0)
        .map((item) => ({ item, quantity: quantities[item.id] })),
    [menu, quantities],
  );
  // Only for display. The server recalculates the real total.
  const total = cartLines.reduce((sum, line) => sum + line.item.priceCop * line.quantity, 0);

  function changeQuantity(id: string, delta: number) {
    setQuantities((previous) => ({
      ...previous,
      [id]: Math.max(0, Math.min(20, (previous[id] ?? 0) + delta)),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Unary gRPC call: create the order and get its id back.
      const response = await client.createOrder({
        customerName,
        deliveryAddress,
        lines: cartLines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      });
      if (response.order) setOrderId(response.order.id);
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function startNewOrder() {
    setOrderId(null);
    setQuantities({});
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>🛵 FastBite</h1>
        <p>Order food and watch your delivery in real time. Powered by gRPC.</p>
      </header>

      <main>
        {orderId ? (
          <Tracker orderId={orderId} onNewOrder={startNewOrder} />
        ) : (
          <>
            <section className="card">
              <h2>Menu</h2>
              {loadingMenu && (
                <p className="muted">
                  Loading the menu… (on a free hosting plan the server can take up to a minute to wake up)
                </p>
              )}
              {menuError && <p className="error" role="alert">{menuError}</p>}
              <ul className="menu">
                {menu.map((item) => {
                  const quantity = quantities[item.id] ?? 0;
                  return (
                    <li key={item.id}>
                      <span className="menu-emoji" aria-hidden="true">{item.emoji}</span>
                      <div className="menu-info">
                        <strong>{item.name}</strong>
                        <span className="muted">{item.description}</span>
                        <span className="price">{formatCop(item.priceCop)}</span>
                      </div>
                      <div className="qty">
                        <button
                          type="button"
                          className="round"
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={quantity === 0}
                        >
                          −
                        </button>
                        <span aria-live="polite">{quantity}</span>
                        <button
                          type="button"
                          className="round"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => changeQuantity(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <form className="card" onSubmit={handleSubmit}>
              <h2>Your order</h2>
              {cartLines.length === 0 ? (
                <p className="muted">Add something from the menu to get started.</p>
              ) : (
                <ul className="cart">
                  {cartLines.map(({ item, quantity }) => (
                    <li key={item.id}>
                      <span>{quantity} × {item.name}</span>
                      <span>{formatCop(item.priceCop * quantity)}</span>
                    </li>
                  ))}
                  <li className="cart-total">
                    <strong>Total</strong>
                    <strong>{formatCop(total)}</strong>
                  </li>
                </ul>
              )}

              <label>
                Your name
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  maxLength={60}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                Delivery address
                <input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  maxLength={120}
                  required
                  autoComplete="street-address"
                />
              </label>

              {submitError && <p className="error" role="alert">{submitError}</p>}

              <button type="submit" disabled={submitting || cartLines.length === 0}>
                {submitting ? "Placing order…" : "Place order"}
              </button>
            </form>
          </>
        )}
      </main>

      <footer>
        Case study project · gRPC-Web + React · The order simulation lasts about 25 seconds.
      </footer>
    </div>
  );
}
