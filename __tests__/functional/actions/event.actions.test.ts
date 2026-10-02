import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import {
  createEvent,
  deleteEvent,
  findEventByEventId,
  getAllEvents,
  getEventsByAuthor,
  getRelatedEventsByCategory,
  updateEvent,
} from "@/lib/actions/event.actions";
import Event from "@/lib/database/modals/event.modal";
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb,
} from "../../helpers/db";
import {
  eventInput,
  makeAuthor,
  makeCategory,
  makeEvent,
} from "../../helpers/factories";

jest.mock("@/lib/database", () => ({ connectToDatabase: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

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

/** Creates events one millisecond apart so `createdAt desc` ordering is stable. */
async function makeEvents(
  count: number,
  organizer: Types.ObjectId,
  category: Types.ObjectId,
  overrides: (i: number) => Record<string, unknown> = () => ({})
) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push(
      await makeEvent(organizer, category, {
        createdAt: new Date(Date.UTC(2024, 0, 1, 0, 0, 0, i)),
        ...overrides(i),
      })
    );
  }
  return events;
}

describe("createEvent", () => {
  it("creates an event linked to its organizer and category", async () => {
    const author = await makeAuthor();
    const category = await makeCategory();
    const input = eventInput({ categoryId: id(category) });

    const created = await createEvent({
      event: input,
      authorId: id(author),
      path: "/profile",
    });

    expect(created).toMatchObject({
      title: input.title,
      organizer: id(author),
      category: id(category),
      price: "10",
      isFree: false,
    });
    expect(await Event.countDocuments()).toBe(1);
  });

  it("refuses to create an event for an unknown organizer", async () => {
    await expect(
      createEvent({
        event: eventInput(),
        authorId: new Types.ObjectId().toString(),
        path: "/profile",
      })
    ).rejects.toThrow();
    expect(await Event.countDocuments()).toBe(0);
  });

  it("rejects an event without an image", async () => {
    const author = await makeAuthor();

    await expect(
      createEvent({
        event: eventInput({ imageUrl: "" }),
        authorId: id(author),
        path: "/profile",
      })
    ).rejects.toThrow();
  });
});

describe("updateEvent", () => {
  it("lets the organizer update their event and revalidates the path", async () => {
    const author = await makeAuthor();
    const category = await makeCategory();
    const newCategory = await makeCategory();
    const event = await makeEvent(author._id, category._id);

    const updated = await updateEvent({
      authorId: id(author),
      event: {
        ...eventInput({ categoryId: id(newCategory) }),
        _id: id(event),
        title: "Renamed",
      },
      path: `/events/${id(event)}`,
    });

    expect(updated).toMatchObject({
      _id: id(event),
      title: "Renamed",
      category: id(newCategory),
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${id(event)}`);
  });

  it("rejects updates from someone other than the organizer", async () => {
    const owner = await makeAuthor();
    const other = await makeAuthor();
    const category = await makeCategory();
    const event = await makeEvent(owner._id, category._id, { title: "Orig" });

    await expect(
      updateEvent({
        authorId: id(other),
        event: { ...eventInput(), _id: id(event), title: "Hacked" },
        path: "/",
      })
    ).rejects.toThrow();
    expect((await Event.findById(event._id))?.title).toBe("Orig");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects updates to a missing event", async () => {
    const author = await makeAuthor();

    await expect(
      updateEvent({
        authorId: id(author),
        event: { ...eventInput(), _id: new Types.ObjectId().toString() },
        path: "/",
      })
    ).rejects.toThrow();
  });
});

describe("deleteEvent", () => {
  it("deletes the event and revalidates the path", async () => {
    const author = await makeAuthor();
    const category = await makeCategory();
    const event = await makeEvent(author._id, category._id);

    await deleteEvent({ eventId: id(event), path: "/profile" });

    expect(await Event.findById(event._id)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("does not revalidate when nothing was deleted", async () => {
    await deleteEvent({
      eventId: new Types.ObjectId().toString(),
      path: "/profile",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("findEventByEventId", () => {
  it("returns the event with organizer and category populated", async () => {
    const author = await makeAuthor({ firstName: "Ada", lastName: "Lovelace" });
    const category = await makeCategory("Science");
    const event = await makeEvent(author._id, category._id);

    const found = await findEventByEventId(id(event));

    expect(found.organizer).toEqual({
      _id: id(author),
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(found.category).toEqual({ _id: id(category), name: "Science" });
  });

  it("throws when the event does not exist", async () => {
    await expect(
      findEventByEventId(new Types.ObjectId().toString())
    ).rejects.toThrow();
  });
});

describe("getAllEvents", () => {
  it("returns the newest events first, paginated", async () => {
    const author = await makeAuthor();
    const category = await makeCategory();
    const events = await makeEvents(5, author._id, category._id);

    const page1 = await getAllEvents({
      query: "",
      category: "",
      limit: 2,
      page: 1,
    });
    const page3 = await getAllEvents({
      query: "",
      category: "",
      limit: 2,
      page: 3,
    });

    expect(page1?.totalPages).toBe(3);
    expect(page1?.data.map(id)).toEqual([id(events[4]), id(events[3])]);
    expect(page3?.data.map(id)).toEqual([id(events[0])]);
    expect(page1?.data[0].organizer.firstName).toBe(author.firstName);
  });

  it("filters by a case-insensitive title search", async () => {
    const author = await makeAuthor();
    const category = await makeCategory();
    await makeEvents(3, author._id, category._id, (i) => ({
      title: ["React Conf", "Jazz Night", "react meetup"][i],
    }));

    const result = await getAllEvents({
      query: "REACT",
      category: "",
      limit: 6,
      page: 1,
    });

    expect(result?.data.map((e: any) => e.title).sort()).toEqual([
      "React Conf",
      "react meetup",
    ]);
    expect(result?.totalPages).toBe(1);
  });

  it("filters by category name", async () => {
    const author = await makeAuthor();
    const tech = await makeCategory("Tech");
    const music = await makeCategory("Music");
    const [techEvent] = await makeEvents(1, author._id, tech._id);
    await makeEvents(2, author._id, music._id);

    const result = await getAllEvents({
      query: "",
      category: "tech",
      limit: 6,
      page: 1,
    });

    expect(result?.data.map(id)).toEqual([id(techEvent)]);
  });

  it("combines title and category filters", async () => {
    const author = await makeAuthor();
    const tech = await makeCategory("Tech");
    const music = await makeCategory("Music");
    await makeEvent(author._id, tech._id, { title: "Night Hack" });
    await makeEvent(author._id, music._id, { title: "Night Jazz" });

    const result = await getAllEvents({
      query: "night",
      category: "Music",
      limit: 6,
      page: 1,
    });

    expect(result?.data.map((e: any) => e.title)).toEqual(["Night Jazz"]);
  });

  it("returns no pages when there are no events", async () => {
    await expect(
      getAllEvents({ query: "", category: "", limit: 6, page: 1 })
    ).resolves.toEqual({ data: [], totalPages: 0 });
  });
});

describe("getEventsByAuthor", () => {
  it("only returns events organised by the author", async () => {
    const author = await makeAuthor();
    const other = await makeAuthor();
    const category = await makeCategory();
    const mine = await makeEvents(3, author._id, category._id);
    await makeEvents(2, other._id, category._id);

    const result = await getEventsByAuthor({
      authorId: id(author),
      limit: 2,
      page: 2,
    });

    expect(result?.totalPages).toBe(2);
    expect(result?.data.map(id)).toEqual([id(mine[0])]);
  });
});

describe("getRelatedEventsByCategory", () => {
  it("returns other events in the same category, excluding the current one", async () => {
    const author = await makeAuthor();
    const tech = await makeCategory("Tech");
    const music = await makeCategory("Music");
    const techEvents = await makeEvents(3, author._id, tech._id);
    await makeEvents(1, author._id, music._id);

    const result = await getRelatedEventsByCategory({
      categoryId: id(tech),
      eventId: id(techEvents[0]),
      page: 1,
    });

    expect(result?.data.map(id)).toEqual([
      id(techEvents[2]),
      id(techEvents[1]),
    ]);
    expect(result?.totalPages).toBe(1);
  });

  it("accepts page as a string and defaults the limit to 3", async () => {
    const author = await makeAuthor();
    const tech = await makeCategory("Tech");
    const events = await makeEvents(5, author._id, tech._id);

    const result = await getRelatedEventsByCategory({
      categoryId: id(tech),
      eventId: id(events[4]),
      page: "2",
    });

    expect(result?.totalPages).toBe(2);
    expect(result?.data.map(id)).toEqual([id(events[0])]);
  });
});
