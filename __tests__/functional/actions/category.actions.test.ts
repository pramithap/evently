import {
  createCategory,
  getAllCategories,
} from "@/lib/actions/category.actions";
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb,
} from "../../helpers/db";

jest.mock("@/lib/database", () => ({ connectToDatabase: jest.fn() }));

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("category actions", () => {
  it("creates a category and lists it", async () => {
    const created = await createCategory({ categoryName: "Tech" });

    expect(created).toMatchObject({ name: "Tech" });
    expect(typeof created._id).toBe("string");
    await expect(getAllCategories()).resolves.toEqual([created]);
  });

  it("returns an empty list when there are no categories", async () => {
    await expect(getAllCategories()).resolves.toEqual([]);
  });

  it("rejects duplicate category names", async () => {
    await createCategory({ categoryName: "Music" });

    await expect(createCategory({ categoryName: "Music" })).rejects.toThrow();
    await expect(getAllCategories()).resolves.toHaveLength(1);
  });

  it("rejects an empty category name", async () => {
    await expect(createCategory({ categoryName: "" })).rejects.toThrow();
  });
});
