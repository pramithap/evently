import { eventFormSchema } from "@/lib/validator";

const valid = {
  title: "Tech Summit",
  description: "An event about tech",
  location: "Online",
  imageUrl: "https://utfs.io/f/image.png",
  startDateTime: new Date("2030-01-01T10:00:00Z"),
  endDateTime: new Date("2030-01-01T12:00:00Z"),
  categoryId: "65b0c0ffee0000000000abcd",
  price: "25",
  isFree: false,
  url: "https://example.com/event",
};

const errorFor = (data: unknown, path: string) => {
  const result = eventFormSchema.safeParse(data);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
};

describe("eventFormSchema", () => {
  it("accepts a valid event", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["title", "ab", "Title must be at least 3 characters"],
    ["description", "ab", "Description must be at least 3 characters"],
    [
      "description",
      "a".repeat(401),
      "Description must be less than 400 characters",
    ],
    ["location", "ab", "Location must be at least 3 characters"],
    ["location", "a".repeat(401), "Location must be less than 400 characters"],
  ])("rejects %s=%j with a helpful message", (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message);
  });

  it("accepts description and location at the 400 character limit", () => {
    const max = "a".repeat(400);
    expect(
      eventFormSchema.safeParse({ ...valid, description: max, location: max })
        .success
    ).toBe(true);
  });

  it("requires a valid url", () => {
    expect(errorFor({ ...valid, url: "not-a-url" }, "url")).toBe("Invalid url");
  });

  it("requires Date objects for start/end", () => {
    expect(
      errorFor({ ...valid, startDateTime: "2030-01-01" }, "startDateTime")
    ).toBeDefined();
  });

  it("requires isFree to be a boolean", () => {
    expect(errorFor({ ...valid, isFree: "yes" }, "isFree")).toBeDefined();
  });

  it.each(Object.keys(valid))("requires %s", (field) => {
    const { [field as keyof typeof valid]: _omit, ...rest } = valid;
    expect(errorFor(rest, field)).toBe("Required");
  });
});
