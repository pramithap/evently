"use server";

import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/database";
import { handleError } from "@/lib/utils";

import { CreateAuthorParams, UpdateAuthorParams } from "@/types";
import Author from "../database/modals/author.modal";
import Order from "../database/modals/order.modal";
import Event from "../database/modals/event.modal";

export async function createAuthor(author: CreateAuthorParams) {
  try {
    await connectToDatabase();

    const newAuthor = await Author.create(author);
    return JSON.parse(JSON.stringify(newAuthor));
  } catch (error) {
    handleError(error);
  }
}

export async function getAuthorById(authorId: string) {
  try {
    await connectToDatabase();

    const author = await Author.findById(authorId);

    if (!author) throw new Error("Author not found");
    return JSON.parse(JSON.stringify(author));
  } catch (error) {
    handleError(error);
  }
}

export async function updateAuthor(
  clerkId: string,
  author: UpdateAuthorParams
) {
  try {
    await connectToDatabase();

    const updatedAuthor = await Author.findOneAndUpdate({ clerkId }, author, {
      new: true,
    });

    if (!updatedAuthor) throw new Error("Author update failed");
    return JSON.parse(JSON.stringify(updatedAuthor));
  } catch (error) {
    handleError(error);
  }
}

export async function deleteAuthor(clerkId: string) {
  try {
    await connectToDatabase();

    // Find Author to delete
    const AuthorToDelete = await Author.findOne({ clerkId });

    if (!AuthorToDelete) {
      throw new Error("Author not found");
    }

    // Unlink relationships
    await Promise.all([
      // Update the 'events' collection to remove references to the Author
      Event.updateMany(
        { _id: { $in: AuthorToDelete.events } },
        { $pull: { organizer: AuthorToDelete._id } }
      ),

      // Update the 'orders' collection to remove references to the Author
      Order.updateMany(
        { _id: { $in: AuthorToDelete.orders } },
        { $unset: { buyer: 1 } }
      ),
    ]);

    // Delete Author
    const deletedAuthor = await Author.findByIdAndDelete(AuthorToDelete._id);
    revalidatePath("/");

    return deletedAuthor ? JSON.parse(JSON.stringify(deletedAuthor)) : null;
  } catch (error) {
    handleError(error);
  }
}
