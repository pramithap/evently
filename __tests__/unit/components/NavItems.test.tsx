/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import NavItems from "@/components/ui/shared/NavItems";
import { headerLinks } from "@/constants";
import { setUrl } from "../../helpers/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("NavItems", () => {
  it("renders a link for every header route", () => {
    setUrl("/");
    render(<NavItems />);

    for (const { label, route } of headerLinks) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        route
      );
    }
  });

  it("highlights only the active route", () => {
    setUrl("/profile");
    render(<NavItems />);

    expect(screen.getByText("My Profile").closest("li")).toHaveClass(
      "text-primary-500"
    );
    expect(screen.getByText("Home").closest("li")).not.toHaveClass(
      "text-primary-500"
    );
  });
});
