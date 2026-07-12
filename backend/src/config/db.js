// backend/src/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI is not configured; starting without a database connection.");
      return null;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("Database Connected");

    if (mongoose.models.FeePayment) {
      try {
        await mongoose.models.FeePayment.syncIndexes();
      } catch (indexError) {
        console.warn("FeePayment index sync failed:", indexError.message);
      }
    }
    
  } catch (error) {
    console.warn("Database connection failed, continuing in degraded mode:", error.message);
    return null;
  }
};

export default connectDB;
