/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmation } from "@/components/ui/shared/DeleteConfirmation";
import { deleteEvent } from "@/lib/actions/event.actions";
import { setUrl } from "../../helpers/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock("@/lib/actions/event.actions", () => ({ deleteEvent: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  setUrl("/profile");
});

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button"));
  return screen.findByRole("alertdialog");
};

describe("DeleteConfirmation", () => {
  it("asks for confirmation before deleting", async () => {
    render(<DeleteConfirmation eventId="event_1" />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await openDialog();

    expect(
      screen.getByText("Are you sure you want to delete?")
    ).toBeInTheDocument();
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it("does nothing when cancelled", async () => {
    render(<DeleteConfirmation eventId="event_1" />);
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it("deletes the event for the current path when confirmed", async () => {
    render(<DeleteConfirmation eventId="event_1" />);
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteEvent).toHaveBeenCalledWith({
        eventId: "event_1",
        path: "/profile",
      })
    );
  });
});
