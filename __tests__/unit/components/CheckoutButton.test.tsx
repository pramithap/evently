/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { loadStripe } from "@stripe/stripe-js";
import { useUser } from "@clerk/nextjs";
import CheckoutButton from "@/components/ui/shared/CheckoutButton";
import { IEvent } from "@/lib/database/modals/event.modal";

let mockSignedIn = false;

jest.mock("@clerk/nextjs", () => ({
  useUser: jest.fn(),
  SignedIn: ({ children }: { children: React.ReactNode }) =>
    mockSignedIn ? <>{children}</> : null,
  SignedOut: ({ children }: { children: React.ReactNode }) =>
    mockSignedIn ? null : <>{children}</>,
}));
jest.mock("@stripe/stripe-js", () => ({ loadStripe: jest.fn() }));
jest.mock("@/lib/actions/order.actions", () => ({ checkoutOrder: jest.fn() }));

const event = (overrides: Partial<IEvent> = {}) =>
  ({
    _id: "event_1",
    title: "Tech Summit",
    price: "25",
    isFree: false,
    endDateTime: new Date(Date.now() + 86_400_000),
    ...overrides,
  }) as unknown as IEvent;

beforeEach(() => {
  // React 18.2 (used by Jest) doesn't know Next's function-valued <form action>.
  const consoleError = console.error;
  jest.spyOn(console, "error").mockImplementation((msg, ...args) => {
    if (String(msg).includes("Invalid value for prop `action`")) return;
    consoleError(msg, ...args);
  });
  mockSignedIn = false;
  (useUser as jest.Mock).mockReturnValue({ user: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CheckoutButton", () => {
  it("initialises Stripe once at module load", () => {
    expect(loadStripe).toHaveBeenCalledTimes(1);
  });

  it("tells users when the event has already finished", () => {
    render(
      <CheckoutButton
        event={event({ endDateTime: new Date(Date.now() - 1000) })}
      />
    );

    expect(
      screen.getByText("Sorry, tickets are no longer available.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("sends signed-out users to sign in", () => {
    render(<CheckoutButton event={event()} />);

    expect(screen.getByRole("link", { name: "Get Tickets" })).toHaveAttribute(
      "href",
      "/sign-in"
    );
  });

  it("shows a Buy Ticket button for paid events when signed in", () => {
    mockSignedIn = true;
    (useUser as jest.Mock).mockReturnValue({
      user: { publicMetadata: { userId: "author_1" } },
    });
    render(<CheckoutButton event={event()} />);

    expect(screen.getByRole("link", { name: "Buy Ticket" })).toHaveAttribute(
      "type",
      "submit"
    );
    expect(screen.queryByText("Get Tickets")).not.toBeInTheDocument();
  });

  it("shows a Get Ticket button for free events when signed in", () => {
    mockSignedIn = true;
    render(<CheckoutButton event={event({ isFree: true })} />);

    expect(
      screen.getByRole("link", { name: "Get Ticket" })
    ).toBeInTheDocument();
  });
});
