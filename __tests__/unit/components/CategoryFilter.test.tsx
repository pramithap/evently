/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryFilter from "@/components/ui/shared/CategoryFilter";
import { getAllCategories } from "@/lib/actions/category.actions";
import { mockPush, setUrl } from "../../helpers/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock("@/lib/actions/category.actions", () => ({
  getAllCategories: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  (getAllCategories as jest.Mock).mockResolvedValue([
    { _id: "1", name: "Tech" },
    { _id: "2", name: "Music" },
  ]);
});

// Wait for the categories fetched on mount to land in state.
const renderFilter = () => act(async () => void render(<CategoryFilter />));

const choose = async (name: string) => {
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name }));
};

describe("CategoryFilter", () => {
  it("lists All plus every category from the database", async () => {
    setUrl("/");
    await renderFilter();

    await userEvent.click(screen.getByRole("combobox"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["All", "Tech", "Music"]);
  });

  it("adds the selected category to the URL", async () => {
    setUrl("/?query=jazz");
    await renderFilter();

    await choose("Music");

    expect(mockPush).toHaveBeenCalledWith("/?category=Music&query=jazz", {
      scroll: false,
    });
  });

  it("removes the category filter when All is selected", async () => {
    setUrl("/?category=Tech&query=jazz");
    await renderFilter();

    await choose("All");

    expect(mockPush).toHaveBeenCalledWith("/?query=jazz", { scroll: false });
  });
});
