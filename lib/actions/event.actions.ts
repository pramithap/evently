"use server";

import { CreateEventParams } from "@/types";
import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Author from "../database/modals/author.modal";
import Event from "../database/modals/event.modal";

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
