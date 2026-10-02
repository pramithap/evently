import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import {
  createAuthor,
  deleteAuthor,
  getAuthorById,
  updateAuthor,
} from "@/lib/actions/author.actions";
import Author from "@/lib/database/modals/author.modal";
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb,
} from "../../helpers/db";
import { authorData, makeAuthor } from "../../helpers/factories";

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

describe("createAuthor", () => {
  it("persists the author and returns a plain object", async () => {
    const data = authorData();

    const created = await createAuthor(data);

    expect(created).toMatchObject(data);
    expect(typeof created._id).toBe("string");
    expect(await Author.countDocuments({ clerkId: data.clerkId })).toBe(1);
  });

  it.each(["clerkId", "email", "username"])(
    "rejects a duplicate %s",
    async (field) => {
      const existing = await makeAuthor();
      const data = authorData({ [field]: existing.get(field) });

      await expect(createAuthor(data)).rejects.toThrow();
      expect(await Author.countDocuments()).toBe(1);
    }
  );

  it("rejects missing required fields", async () => {
    const { photo, ...data } = authorData();

    await expect(createAuthor(data as any)).rejects.toThrow();
  });
});

describe("getAuthorById", () => {
  it("returns the author", async () => {
    const author = await makeAuthor();

    await expect(getAuthorById(author._id.toString())).resolves.toMatchObject({
      _id: author._id.toString(),
      email: author.email,
    });
  });

  it("throws when the author does not exist", async () => {
    await expect(
      getAuthorById(new Types.ObjectId().toString())
    ).rejects.toThrow();
  });
});

describe("updateAuthor", () => {
  it("updates by clerkId and returns the new document", async () => {
    const author = await makeAuthor();
    const update = {
      firstName: "New",
      lastName: "Name",
      username: "renamed",
      photo: "https://img.example.com/new.png",
    };

    const updated = await updateAuthor(author.clerkId, update);

    expect(updated).toMatchObject({ ...update, clerkId: author.clerkId });
    expect((await Author.findById(author._id))?.username).toBe("renamed");
  });

  it("throws when no author matches the clerkId", async () => {
    await expect(
      updateAuthor("missing", {
        firstName: "a",
        lastName: "b",
        username: "c",
        photo: "d",
      })
    ).rejects.toThrow();
  });
});

describe("deleteAuthor", () => {
  it("throws when no author matches the clerkId", async () => {
    await expect(deleteAuthor("missing")).rejects.toThrow();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes the author and revalidates the home page", async () => {
    const author = await makeAuthor();

    const deleted = await deleteAuthor(author.clerkId);

    expect(deleted).toMatchObject({ _id: author._id.toString() });
    expect(await Author.findById(author._id)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
