import mongoose from "mongoose";

export const connectDB = async () => {
  const MAX_RETRIES = 5;

  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI!);
      console.log("MongoDB Connected");
      return;
    } catch (error) {
      console.log(`Mongo connection failed. Attempt ${i}`, error);

      if (i === MAX_RETRIES) {
        throw error;
      }

      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};
