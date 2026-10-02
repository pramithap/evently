/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import { auth } from "@clerk/nextjs";
import Collection from "@/components/ui/shared/Collection";
import { IEvent } from "@/lib/database/modals/event.modal";
import { setUrl } from "../../helpers/navigation";

jest.mock("@clerk/nextjs", () => ({ auth: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock("@/lib/actions/event.actions", () => ({ deleteEvent: jest.fn() }));

const makeEvent = (overrides: Partial<IEvent> = {}) =>
  ({
    _id: "event_1",
    title: "Tech Summit",
    imageUrl: "https://utfs.io/f/image.png",
    startDateTime: new Date("2030-01-01T10:00:00Z"),
    endDateTime: new Date("2030-01-01T12:00:00Z"),
    price: "25",
    isFree: false,
    category: { _id: "cat_1", name: "Tech" },
    organizer: { _id: "author_1", firstName: "Ada", lastName: "Lovelace" },
    ...overrides,
  }) as unknown as IEvent;

const signInAs = (userId?: string) =>
  (auth as jest.Mock).mockReturnValue({
    sessionClaims: userId ? { userId } : null,
  });

const baseProps = {
  emptyTitle: "No Events Found",
  emptyStateSubtext: "Come back later",
  limit: 6,
  page: 1,
};

beforeEach(() => {
  setUrl("/");
  signInAs(undefined);
});

describe("Collection", () => {
  it("shows the empty state when there is no data", () => {
    render(<Collection {...baseProps} data={[]} />);

    expect(screen.getByText("No Events Found")).toBeInTheDocument();
    expect(screen.getByText("Come back later")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders a card per event with price, category, date and organizer", () => {
    render(
      <Collection
        {...baseProps}
        data={[
          makeEvent(),
          makeEvent({ _id: "event_2", title: "Free Fest", isFree: true }),
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = within(items[0]);
    expect(first.getByText("$25")).toBeInTheDocument();
    expect(first.getByText("Tech")).toBeInTheDocument();
    expect(first.getByText("Tue, Jan 1, 10:00 AM")).toBeInTheDocument();
    expect(first.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(first.getByText("Tech Summit").closest("a")).toHaveAttribute(
      "href",
      "/events/event_1"
    );
    expect(within(items[1]).getByText("FREE")).toBeInTheDocument();
  });

  it("only shows edit/delete controls to the event creator", () => {
    signInAs("author_1");
    const { rerender } = render(
      <Collection {...baseProps} data={[makeEvent()]} />
    );
    expect(screen.getByRole("link", { name: "edit" })).toHaveAttribute(
      "href",
      "/events/event_1/update"
    );

    signInAs("someone_else");
    rerender(<Collection {...baseProps} data={[makeEvent()]} />);
    expect(
      screen.queryByRole("link", { name: "edit" })
    ).not.toBeInTheDocument();
  });

  it("shows order details links for organised events", () => {
    render(
      <Collection
        {...baseProps}
        data={[makeEvent()]}
        collectionType="Events_Organized"
      />
    );

    expect(
      screen.getByText("Order Details").closest("a")
    ).toHaveAttribute("href", "/orders?eventId=event_1");
  });

  it("hides price and creator controls for My_Tickets", () => {
    signInAs("author_1");
    render(
      <Collection
        {...baseProps}
        data={[makeEvent()]}
        collectionType="My_Tickets"
      />
    );

    expect(screen.queryByText("$25")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "edit" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Order Details")).not.toBeInTheDocument();
  });

  it("only renders pagination when there is more than one page", () => {
    const { rerender } = render(
      <Collection {...baseProps} data={[makeEvent()]} totalPages={1} />
    );
    expect(
      screen.queryByRole("button", { name: "Next" })
    ).not.toBeInTheDocument();

    rerender(<Collection {...baseProps} data={[makeEvent()]} totalPages={2} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });
});
