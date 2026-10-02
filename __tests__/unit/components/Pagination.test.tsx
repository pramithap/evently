/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "@/components/ui/shared/Pagination";
import { mockPush, setUrl } from "../../helpers/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  setUrl("/?category=Tech&page=2");
});

describe("Pagination", () => {
  it("navigates to the next page preserving other params", async () => {
    render(<Pagination page={2} totalPages={5} />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(mockPush).toHaveBeenCalledWith("/?category=Tech&page=3", {
      scroll: false,
    });
  });

  it("navigates to the previous page", async () => {
    render(<Pagination page="2" totalPages={5} />);

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(mockPush).toHaveBeenCalledWith("/?category=Tech&page=1", {
      scroll: false,
    });
  });

  it("uses a custom url param name", async () => {
    setUrl("/profile");
    render(<Pagination page={1} totalPages={3} urlParamName="ordersPage" />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(mockPush).toHaveBeenCalledWith("/profile?ordersPage=2", {
      scroll: false,
    });
  });

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} totalPages={3} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={3} totalPages={3} />);

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });
});
