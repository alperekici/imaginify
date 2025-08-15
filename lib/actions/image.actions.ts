"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

// ✅ Frontend-friendly type
export type SerializedImage = {
  _id: string;
  title: string;
  transformationType: string;
  publicId: string;
  secureURL: string;
  width?: number;
  height?: number;
  config?: object;
  transformationUrl?: string;
  aspectRatio?: string;
  color?: string;
  prompt?: string;
  author: {
    [x: string]: string | null;
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

// Helper to serialize Mongo ObjectId
const serializeImage = (img: any): SerializedImage => ({
  ...img,
  _id: (img._id as Types.ObjectId).toString(),
  author: {
    ...img.author,
    _id: img.author?._id?.toString() || "",
  },
});

// Populate author info
const populateUser = (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName clerkId",
  });

// ---------- ADD IMAGE ----------
export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await connectToDatabase();
    const author = await User.findById(userId);
    if (!author) throw new Error("User not found");

    const newImage = await Image.create({
      ...image,
      author: author._id,
    });

    revalidatePath(path);

    return serializeImage(newImage.toObject());
  } catch (error) {
    handleError(error);
  }
}

// ---------- UPDATE IMAGE ----------
export async function updateImage({ image, userId, path }: UpdateImageParams) {
  try {
    await connectToDatabase();
    const imageToUpdate = await Image.findById(image._id);

    if (!imageToUpdate || imageToUpdate.author.toHexString() !== userId) {
      throw new Error("Unauthorized or image not found");
    }

    const updatedImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      image,
      { new: true }
    ).lean();

    if (!updatedImage) throw new Error("Image update failed");

    revalidatePath(path);

    return serializeImage(updatedImage);
  } catch (error) {
    handleError(error);
  }
}

// ---------- DELETE IMAGE ----------
export async function deleteImage(imageId: string) {
  try {
    await connectToDatabase();
    await Image.findByIdAndDelete(imageId);
  } catch (error) {
    handleError(error);
  } finally {
    redirect("/");
  }
}

// ---------- GET IMAGE BY ID ----------
export async function getImageById(imageId: string) {
  try {
    await connectToDatabase();
    const image = await populateUser(Image.findById(imageId)).lean();
    if (!image) throw new Error("Image not found");

    return serializeImage(image);
  } catch (error) {
    handleError(error);
  }
}

// ---------- GET ALL IMAGES ----------
export async function getAllImages({
  limit = 9,
  page = 1,
  searchQuery = "",
}: {
  limit?: number;
  page: number;
  searchQuery?: string;
}) {
  try {
    await connectToDatabase();

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    let expression = "folder=imaginify";
    if (searchQuery) {
      expression += ` AND ${searchQuery}`;
    }

    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();

    const resourceIds = resources.map((r: any) => r.public_id);
    let query: Record<string, unknown> = {};

    if (searchQuery) {
      query = { publicId: { $in: resourceIds } };
    }

    const skipAmount = (page - 1) * limit;

    const images = await populateUser(
      Image.find(query)
        .sort({ updatedAt: -1 })
        .skip(skipAmount)
        .limit(limit)
        .lean()
    );

    const totalImages = await Image.countDocuments(query);
    const savedImages = await Image.countDocuments();

    return {
      data: images.map(serializeImage),
      totalPage: Math.ceil(totalImages / limit),
      savedImages,
    };
  } catch (error) {
    handleError(error);
  }
}

// ---------- GET IMAGES BY USER ----------
export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await connectToDatabase();
    const skipAmount = (page - 1) * limit;

    const images = await populateUser(
      Image.find({ author: userId })
        .sort({ updatedAt: -1 })
        .skip(skipAmount)
        .limit(limit)
        .lean()
    );

    const totalImages = await Image.countDocuments({ author: userId });

    return {
      data: images.map(serializeImage),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
