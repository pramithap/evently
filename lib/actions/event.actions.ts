"use server";

import { CreateEventParams, UpdateEventParams } from "@/types";
import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Author from "../database/modals/author.modal";
import Event from "../database/modals/event.modal";
import { revalidatePath } from "next/cache";

export const createEvent = async ({
  event,
  authorId,
  path,
}: CreateEventParams) => {
  try {
    await connectToDatabase();
    console.log("create event called ");
    const organizer = await Author.findById(authorId);
    if (!organizer) {
      throw new Error("Organizer not found!");
    }
    console.log("createEvent");
    const newEvent = await Event.create({
      ...event,
      category: event.categoryId,
      organizer: authorId,
    });

    return JSON.parse(JSON.stringify(newEvent));
  } catch (error) {
    handleError(error);
  }
};

// UPDATE
export async function updateEvent({
  authorId,
  event,
  path,
}: UpdateEventParams) {
  try {
    await connectToDatabase();

    const eventToUpdate = await Event.findById(event._id);
    if (!eventToUpdate || eventToUpdate.organizer.toHexString() !== authorId) {
      throw new Error("Unauthorized or event not found");
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { ...event, category: event.categoryId },
      { new: true }
    );
    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedEvent));
  } catch (error) {
    handleError(error);
  }
}
