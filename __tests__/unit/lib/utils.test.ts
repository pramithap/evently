/**
 * @jest-environment jsdom
 */
import {
  cn,
  convertFileToUrl,
  formatDateTime,
  formatPrice,
  formUrlQuery,
  handleError,
  removeKeysFromQuery,
} from "@/lib/utils";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets later tailwind classes override conflicting earlier ones", () => {
    expect(cn("p-2 text-red-500", "p-4")).toBe("text-red-500 p-4");
  });
});

describe("formatDateTime", () => {
  // TZ is pinned to UTC in jest.config.js.
  const date = new Date("2023-10-25T20:30:00Z");

  it("returns date+time, date-only and time-only strings", () => {
    expect(formatDateTime(date)).toEqual({
      dateTime: "Wed, Oct 25, 8:30 PM",
      dateOnly: "Wed, Oct 25, 2023",
      timeOnly: "8:30 PM",
    });
  });

  it("accepts ISO strings (as returned by JSON-serialised documents)", () => {
    expect(
      formatDateTime("2023-10-25T20:30:00Z" as unknown as Date).timeOnly
    ).toBe("8:30 PM");
  });
});

describe("formatPrice", () => {
  it.each([
    ["10", "$10.00"],
    ["0", "$0.00"],
    ["1234.5", "$1,234.50"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });

  it("returns $NaN for non-numeric input", () => {
    expect(formatPrice("abc")).toBe("$NaN");
  });
});

describe("convertFileToUrl", () => {
  it("delegates to URL.createObjectURL", () => {
    const createObjectURL = jest.fn(() => "blob:mock");
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
    });
    const file = new File(["x"], "x.png", { type: "image/png" });

    expect(convertFileToUrl(file)).toBe("blob:mock");
    expect(createObjectURL).toHaveBeenCalledWith(file);
  });
});

describe("URL query helpers", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/events");
  });

  it("formUrlQuery adds a key to the current path", () => {
    expect(formUrlQuery({ params: "", key: "query", value: "music" })).toBe(
      "/events?query=music"
    );
  });

  it("formUrlQuery replaces an existing key and keeps the others", () => {
    expect(
      formUrlQuery({
        params: "category=Tech&page=2",
        key: "page",
        value: "3",
      })
    ).toBe("/events?category=Tech&page=3");
  });

  it("formUrlQuery drops the key when value is null", () => {
    expect(
      formUrlQuery({ params: "page=2&query=a", key: "query", value: null })
    ).toBe("/events?page=2");
  });

  it("removeKeysFromQuery removes only the given keys", () => {
    expect(
      removeKeysFromQuery({
        params: "category=Tech&page=2&query=a",
        keysToRemove: ["query", "category"],
      })
    ).toBe("/events?page=2");
  });

  it("removeKeysFromQuery returns the bare path when nothing is left", () => {
    expect(
      removeKeysFromQuery({ params: "query=a", keysToRemove: ["query"] })
    ).toBe("/events");
  });
});

describe("handleError", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs and rethrows string errors verbatim", () => {
    expect(() => handleError("boom")).toThrow(new Error("boom"));
    expect(console.error).toHaveBeenCalledWith("boom");
  });

  it("rethrows objects as JSON", () => {
    expect(() => handleError({ code: 11000 })).toThrow('{"code":11000}');
  });

  it("rethrows Error instances unchanged", () => {
    const error = new Error("Author not found");
    expect(() => handleError(error)).toThrow(error);
  });
});
