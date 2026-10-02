import Stripe from "stripe";
import { POST } from "@/app/api/webhooks/stripe/stripe";
import { createOrder } from "@/lib/actions/order.actions";

jest.mock("@/lib/actions/order.actions", () => ({ createOrder: jest.fn() }));

const SECRET = "whsec_test_secret";

/** Builds a request signed exactly like Stripe would sign it. */
function signedRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

const completedSession = (object: Record<string, unknown>) => ({
  id: "evt_1",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_123", object: "checkout.session", ...object } },
});

describe("Stripe webhook handler", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, STRIPE_WEBHOOK_SECRET: SECRET };
    jest.useFakeTimers({ now: new Date("2024-05-01T00:00:00Z") });
  });

  afterEach(() => {
    process.env = env;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("reports a webhook error when the signature is invalid", async () => {
    const res = await POST(signedRequest(completedSession({}), "whsec_wrong"));

    expect((await res.json()).message).toBe("Webhook error");
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("creates an order from a completed checkout session", async () => {
    (createOrder as jest.Mock).mockResolvedValue({ _id: "order_1" });

    const res = await POST(
      signedRequest(
        completedSession({
          amount_total: 2550,
          metadata: { eventId: "event_1", buyerId: "buyer_1" },
        })
      )
    );

    expect(createOrder).toHaveBeenCalledWith({
      stripeId: "cs_123",
      eventId: "event_1",
      buyerId: "buyer_1",
      totalAmount: "25.5",
      createdAt: new Date("2024-05-01T00:00:00Z"),
    });
    expect(await res.json()).toEqual({
      message: "OK",
      order: { _id: "order_1" },
    });
  });

  it("records free orders as 0 and tolerates missing metadata", async () => {
    await POST(
      signedRequest(completedSession({ amount_total: 0, metadata: null }))
    );

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "", buyerId: "", totalAmount: "0" })
    );
  });

  it("ignores other event types", async () => {
    const res = await POST(
      signedRequest({
        id: "evt_2",
        object: "event",
        type: "payment_intent.created",
        data: { object: {} },
      })
    );

    expect(res.status).toBe(200);
    expect(createOrder).not.toHaveBeenCalled();
  });
});
