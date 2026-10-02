/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import Search from "@/components/ui/shared/Search";
import { mockPush, setUrl } from "../../helpers/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setUrl("/?category=Tech");
});

afterEach(() => {
  jest.useRealTimers();
});

const type = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText("Search title..."), {
    target: { value },
  });

describe("Search", () => {
  it("renders a custom placeholder", () => {
    render(<Search placeholder="Search buyer name..." />);

    expect(
      screen.getByPlaceholderText("Search buyer name...")
    ).toBeInTheDocument();
  });

  it("debounces typing and pushes the query to the URL once", () => {
    render(<Search />);
    act(() => jest.advanceTimersByTime(300));
    mockPush.mockClear();

    type("j");
    act(() => jest.advanceTimersByTime(100));
    type("ja");
    act(() => jest.advanceTimersByTime(100));
    type("jazz");
    expect(mockPush).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/?category=Tech&query=jazz", {
      scroll: false,
    });
  });

  it("removes the query param when the input is cleared", () => {
    setUrl("/?category=Tech&query=jazz");
    render(<Search />);

    type("x");
    type("");
    act(() => jest.advanceTimersByTime(300));

    expect(mockPush).toHaveBeenLastCalledWith("/?category=Tech", {
      scroll: false,
    });
  });
});
