/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventForm from "@/components/ui/shared/EventForm";
import { createEvent, updateEvent } from "@/lib/actions/event.actions";
import { IEvent } from "@/lib/database/modals/event.modal";
import { mockBack, mockPush, setUrl } from "../../helpers/navigation";

const mockStartUpload = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock("@/lib/actions/event.actions", () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}));
jest.mock("@/lib/uploadthing", () => ({
  useUploadThing: () => ({ startUpload: mockStartUpload }),
}));
// Lightweight stand-ins for the category dropdown and drag-and-drop uploader.
jest.mock("@/components/ui/shared/Dropdown", () => ({
  __esModule: true,
  default: ({ onChangeHandler }: { onChangeHandler: (v: string) => void }) => (
    <button type="button" onClick={() => onChangeHandler("cat_1")}>
      Pick category
    </button>
  ),
}));
jest.mock("@/components/ui/shared/FileUploader", () => ({
  FileUploader: ({
    onFieldChange,
    setFiles,
  }: {
    onFieldChange: (url: string) => void;
    setFiles: (files: File[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        setFiles([new File(["img"], "img.png", { type: "image/png" })]);
        onFieldChange("blob:local-preview");
      }}
    >
      Upload image
    </button>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  setUrl("/events/create");
});

async function fillRequiredFields() {
  await userEvent.type(screen.getByPlaceholderText("Event title"), "Tech Summit");
  await userEvent.type(screen.getByPlaceholderText("Description"), "All about tech");
  await userEvent.type(
    screen.getByPlaceholderText("Event location or Online"),
    "Online"
  );
  await userEvent.type(screen.getByPlaceholderText("URL"), "https://example.com");
  await userEvent.click(screen.getByText("Pick category"));
}

describe("EventForm (Create)", () => {
  it("shows validation errors and does not submit an empty form", async () => {
    render(<EventForm type="Create" authorId="author_1" />);

    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    expect(
      await screen.findByText("Title must be at least 3 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be at least 3 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Location must be at least 3 characters")
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid url")).toBeInTheDocument();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("creates the event and navigates to it", async () => {
    (createEvent as jest.Mock).mockResolvedValue({ _id: "event_1" });
    render(<EventForm type="Create" authorId="author_1" />);

    await fillRequiredFields();
    await userEvent.type(screen.getByPlaceholderText("Price"), "25");
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/events/event_1"));
    expect(createEvent).toHaveBeenCalledWith({
      authorId: "author_1",
      path: "/profile",
      event: expect.objectContaining({
        title: "Tech Summit",
        description: "All about tech",
        location: "Online",
        url: "https://example.com",
        categoryId: "cat_1",
        price: "25",
        isFree: false,
        imageUrl: "",
        startDateTime: expect.any(Date),
        endDateTime: expect.any(Date),
      }),
    });
    expect(mockStartUpload).not.toHaveBeenCalled();
  });

  it("submits free events when the Free Ticket box is ticked", async () => {
    (createEvent as jest.Mock).mockResolvedValue({ _id: "event_1" });
    render(<EventForm type="Create" authorId="author_1" />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect((createEvent as jest.Mock).mock.calls[0][0].event.isFree).toBe(true);
  });

  it("uploads the selected image and saves its hosted URL", async () => {
    mockStartUpload.mockResolvedValue([{ url: "https://utfs.io/f/img.png" }]);
    (createEvent as jest.Mock).mockResolvedValue({ _id: "event_1" });
    render(<EventForm type="Create" authorId="author_1" />);

    await fillRequiredFields();
    await userEvent.click(screen.getByText("Upload image"));
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect(mockStartUpload).toHaveBeenCalledWith([expect.any(File)]);
    expect((createEvent as jest.Mock).mock.calls[0][0].event.imageUrl).toBe(
      "https://utfs.io/f/img.png"
    );
  });

  it("aborts when the image upload fails", async () => {
    mockStartUpload.mockResolvedValue(undefined);
    render(<EventForm type="Create" authorId="author_1" />);

    await fillRequiredFields();
    await userEvent.click(screen.getByText("Upload image"));
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(mockStartUpload).toHaveBeenCalled());
    expect(createEvent).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("EventForm (Update)", () => {
  const existing = {
    _id: "event_1",
    title: "Old Title",
    description: "Old description",
    location: "Hall A",
    imageUrl: "https://utfs.io/f/old.png",
    startDateTime: "2030-01-01T10:00:00.000Z",
    endDateTime: "2030-01-01T12:00:00.000Z",
    categoryId: "cat_1",
    price: "10",
    isFree: false,
    url: "https://example.com/old",
  } as unknown as IEvent;

  it("pre-fills the form with the existing event", () => {
    render(
      <EventForm
        type="Update"
        authorId="author_1"
        event={existing}
        eventId="event_1"
      />
    );

    expect(screen.getByPlaceholderText("Event title")).toHaveValue("Old Title");
    expect(screen.getByPlaceholderText("Event location or Online")).toHaveValue(
      "Hall A"
    );
    expect(screen.getByPlaceholderText("Price")).toHaveValue(10);
    expect(
      screen.getByRole("button", { name: "Update Event" })
    ).toBeInTheDocument();
  });

  it("updates the event and navigates to it", async () => {
    (updateEvent as jest.Mock).mockResolvedValue({ _id: "event_1" });
    render(
      <EventForm
        type="Update"
        authorId="author_1"
        event={existing}
        eventId="event_1"
      />
    );

    const title = screen.getByPlaceholderText("Event title");
    await userEvent.clear(title);
    await userEvent.type(title, "New Title");
    await userEvent.click(screen.getByRole("button", { name: "Update Event" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/events/event_1"));
    expect(updateEvent).toHaveBeenCalledWith({
      authorId: "author_1",
      path: "/events/event_1",
      event: expect.objectContaining({
        _id: "event_1",
        title: "New Title",
        imageUrl: "https://utfs.io/f/old.png",
        startDateTime: new Date("2030-01-01T10:00:00.000Z"),
      }),
    });
  });

  it("goes back without saving when no eventId is provided", async () => {
    render(<EventForm type="Update" authorId="author_1" event={existing} />);

    await userEvent.click(screen.getByRole("button", { name: "Update Event" }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(updateEvent).not.toHaveBeenCalled();
  });
});
