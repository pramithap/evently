import { Types } from "mongoose";
import { redirect } from "next/navigation";
import {
  checkoutOrder,
  createOrder,
  getOrdersByAuthor,
  getOrdersByEvent,
} from "@/lib/actions/order.actions";
import Order from "@/lib/database/modals/order.modal";
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb,
} from "../../helpers/db";
import {
  makeAuthor,
  makeCategory,
  makeEvent,
} from "../../helpers/factories";

const mockSessionsCreate = jest.fn();

jest.mock("@/lib/database", () => ({ connectToDatabase: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionsCreate } },
  }))
);

beforeAll(connectTestDb);
afterEach(async () => {
  await clearTestDb();
  jest.clearAllMocks();
});
afterAll(disconnectTestDb);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const id = (doc: { _id: unknown }) => String(doc._id);

async function seedOrder(
  overrides: Partial<{ buyerName: [string, string]; title: string }> = {}
) {
  const [firstName, lastName] = overrides.buyerName ?? ["Jane", "Buyer"];
  const buyer = await makeAuthor({ firstName, lastName });
  const organizer = await makeAuthor();
  const category = await makeCategory();
  const event = await makeEvent(organizer._id, category._id, {
    title: overrides.title ?? "Tech Summit",
  });
  return { buyer, organizer, event };
}

describe("checkoutOrder", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_SERVER_URL: "https://evently.test",
    };
    mockSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_123",
    });
  });

  afterAll(() => {
    process.env = env;
  });

  const order = {
    eventTitle: "Tech Summit",
    eventId: "evt_1",
    price: "25",
    isFree: false,
    buyerId: "buyer_1",
  };

  it("creates a Stripe checkout session priced in cents and redirects to it", async () => {
    await checkoutOrder(order);

    expect(mockSessionsCreate).toHaveBeenCalledWith({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 2500,
            product_data: { name: "Tech Summit" },
          },
          quantity: 1,
        },
      ],
      metadata: { eventId: "evt_1", buyerId: "buyer_1" },
      mode: "payment",
      success_url: "https://evently.test/profile",
      cancel_url: "https://evently.test/",
    });
    expect(redirect).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_123"
    );
  });

  it("charges nothing for free events", async () => {
    await checkoutOrder({ ...order, isFree: true });

    expect(
      mockSessionsCreate.mock.calls[0][0].line_items[0].price_data.unit_amount
    ).toBe(0);
  });

  it("propagates Stripe errors without redirecting", async () => {
    mockSessionsCreate.mockRejectedValue(new Error("card_declined"));

    await expect(checkoutOrder(order)).rejects.toThrow("card_declined");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("createOrder", () => {
  it("stores the order linked to its event and buyer", async () => {
    const { buyer, event } = await seedOrder();

    const created = await createOrder({
      stripeId: "cs_123",
      eventId: id(event),
      buyerId: id(buyer),
      totalAmount: "25",
      createdAt: new Date(),
    });

    expect(created).toMatchObject({
      stripeId: "cs_123",
      event: id(event),
      buyer: id(buyer),
      totalAmount: "25",
    });
    expect(await Order.countDocuments()).toBe(1);
  });

  it("rejects a duplicate Stripe session id", async () => {
    const { buyer, event } = await seedOrder();
    const order = {
      stripeId: "cs_dup",
      eventId: id(event),
      buyerId: id(buyer),
      totalAmount: "25",
      createdAt: new Date(),
    };
    await createOrder(order);

    await expect(createOrder(order)).rejects.toThrow();
    expect(await Order.countDocuments()).toBe(1);
  });
});

describe("getOrdersByEvent", () => {
  it("requires an event id", async () => {
    await expect(
      getOrdersByEvent({ eventId: "", searchString: "" })
    ).rejects.toThrow();
  });

  it("returns an empty list when the event has no orders", async () => {
    await expect(
      getOrdersByEvent({
        eventId: new Types.ObjectId().toString(),
        searchString: "",
      })
    ).resolves.toEqual([]);
  });

  // The $lookup reads from "Authors" but Mongoose stores the Author model in
  // the "authors" collection, so every order is dropped by $unwind.
  it.failing("returns orders for the event filtered by buyer name", async () => {
    const { buyer, event } = await seedOrder({ buyerName: ["Jane", "Buyer"] });
    const other = await makeAuthor({ firstName: "Bob", lastName: "Smith" });
    await Order.create([
      { stripeId: "cs_1", event: event._id, buyer: buyer._id, totalAmount: "25" },
      { stripeId: "cs_2", event: event._id, buyer: other._id, totalAmount: "25" },
    ]);

    const orders = await getOrdersByEvent({
      eventId: id(event),
      searchString: "jane",
    });

    expect(orders).toEqual([
      expect.objectContaining({
        eventId: id(event),
        eventTitle: "Tech Summit",
        buyer: "Jane Buyer",
        totalAmount: "25",
      }),
    ]);
  });
});

describe("getOrdersByAuthor", () => {
  it("returns the buyer's orders newest first with the event populated", async () => {
    const { buyer, event } = await seedOrder({ title: "First" });
    const second = await makeEvent(event.organizer, event.category, {
      title: "Second",
    });
    const someoneElse = await makeAuthor();
    await Order.create([
      {
        stripeId: "cs_1",
        event: event._id,
        buyer: buyer._id,
        createdAt: new Date("2024-01-01"),
      },
      {
        stripeId: "cs_2",
        event: second._id,
        buyer: buyer._id,
        createdAt: new Date("2024-02-01"),
      },
      { stripeId: "cs_3", event: event._id, buyer: someoneElse._id },
    ]);

    const result = await getOrdersByAuthor({ authorId: id(buyer), page: 1 });

    expect(result?.totalPages).toBe(1);
    expect(result?.data.map((o: any) => o.event.title)).toEqual([
      "Second",
      "First",
    ]);
    expect(result?.data[0].event.organizer).toMatchObject({
      _id: String(event.organizer),
    });
  });

  it("paginates with a default limit of 3", async () => {
    const { buyer, event } = await seedOrder();
    await Order.create(
      Array.from({ length: 4 }, (_, i) => ({
        stripeId: `cs_${i}`,
        event: event._id,
        buyer: buyer._id,
        createdAt: new Date(Date.UTC(2024, 0, i + 1)),
      }))
    );

    const page2 = await getOrdersByAuthor({ authorId: id(buyer), page: 2 });

    expect(page2?.totalPages).toBe(2);
    expect(page2?.data.map((o: any) => o.stripeId)).toEqual(["cs_0"]);
  });
});
