import { Types } from "mongoose";
import Author from "@/lib/database/modals/author.modal";
import Category from "@/lib/database/modals/category.modal";
import Event from "@/lib/database/modals/event.modal";

let seq = 0;
const next = () => ++seq;

export function authorData(overrides: Record<string, unknown> = {}) {
  const n = next();
  return {
    clerkId: `clerk_${n}`,
    email: `user${n}@example.com`,
    username: `user${n}`,
    firstName: "Jane",
    lastName: `Doe${n}`,
    photo: `https://img.example.com/${n}.png`,
    ...overrides,
  };
}

export const makeAuthor = (overrides: Record<string, unknown> = {}) =>
  Author.create(authorData(overrides));

export const makeCategory = (name = `Category ${next()}`) =>
  Category.create({ name });

export function eventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: `Event ${next()}`,
    description: "A great event",
    location: "Online",
    imageUrl: "https://utfs.io/f/image.png",
    startDateTime: new Date("2030-01-01T10:00:00Z"),
    endDateTime: new Date("2030-01-01T12:00:00Z"),
    categoryId: new Types.ObjectId().toString(),
    price: "10",
    isFree: false,
    url: "https://example.com",
    ...overrides,
  };
}

export const makeEvent = (
  organizer: Types.ObjectId | string,
  category: Types.ObjectId | string,
  overrides: Record<string, unknown> = {}
) => {
  const { categoryId, ...data } = eventInput(overrides);
  return Event.create({ ...data, organizer, category });
};
