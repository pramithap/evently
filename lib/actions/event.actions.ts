"use server";

import {
  CreateEventParams,
  DeleteEventParams,
  GetAllEventsParams,
  GetEventsByAuthorParams,
  GetRelatedEventsByCategoryParams,
  UpdateEventParams,
} from "@/types";
import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Author from "../database/modals/author.modal";
import Event from "../database/modals/event.modal";
import { revalidatePath } from "next/cache";
import Category from "../database/modals/category.modal";

export const createEvent = async ({
  event,
  authorId,
  path,
}: CreateEventParams) => {
  try {
    await connectToDatabase();
    //console.log("create event called " + authorId);
    const organizer = await Author.findById(authorId);
    if (!organizer) {
      throw new Error("Organizer not found!");
    }
    //console.log("createEvent");
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

//DELETE

// UPDATE
export async function deleteEvent({ eventId, path }: DeleteEventParams) {
  try {
    await connectToDatabase();

    const deletedEvent = await Event.findByIdAndDelete(eventId);
    if (deletedEvent) revalidatePath(path);
  } catch (error) {
    handleError(error);
  }
}

export const populateEvent = async (query: any) => {
  return query
    .populate({
      path: "organizer",
      model: Author,
      select: "_id firstName lastName",
    })
    .populate({ path: "category", model: Category, select: "_id name" });
};

//FIND event by Id
export const findEventByEventId = async (eventId: string) => {
  try {
    await connectToDatabase();

    const eventObj = await populateEvent(Event.findById(eventId));
    if (!eventObj) {
      throw new Error("event not found!");
    }
    //console.log(eventObj);
    return JSON.parse(JSON.stringify(eventObj));
  } catch (error) {
    handleError(error);
  }
};

export async function getRelatedEventsByCategory({
  categoryId,
  eventId,
  limit = 3,
  page = 1,
}: GetRelatedEventsByCategoryParams) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;
    const conditions = {
      $and: [{ category: categoryId }, { _id: { $ne: eventId } }],
    };

    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

const getCategoryByName = async (name: string) => {
  return Category.findOne({ name: { $regex: name, $options: "i" } });
};

export async function getAllEvents({
  query,
  limit = 6,
  page,
  category,
}: GetAllEventsParams) {
  try {
    await connectToDatabase();

    const titleCondition = query
      ? { title: { $regex: query, $options: "i" } }
      : {};
    const categoryCondition = category
      ? await getCategoryByName(category)
      : null;
    const conditions = {
      $and: [
        titleCondition,
        categoryCondition ? { category: categoryCondition._id } : {},
      ],
    };

    const skipAmount = (Number(page) - 1) * limit;
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

// GET EVENTS BY ORGANIZER
export async function getEventsByAuthor({
  authorId,
  limit = 6,
  page,
}: GetEventsByAuthorParams) {
  try {
    await connectToDatabase();

    const conditions = { organizer: authorId };
    const skipAmount = (page - 1) * limit;

    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
