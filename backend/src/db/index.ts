import mongoose from "mongoose";
import { seedDatabase } from "../services/seedService.js";

export const connectDB = async (mongoUri: string) => {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas successfully");
  await seedDatabase();
};
