// backend/src/config/db.js
import "./env.js";
import mongoose from "mongoose";

const DEFAULT_LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/school-mgmt-edu";

const connectWithUri = async (uri, options = {}) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    ...options
  });
};

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI && !process.env.MONGO_URI_FALLBACK) {
      console.warn("MONGO_URI is not configured; starting without a database connection.");
      return null;
    }

    const primaryUri = process.env.MONGO_URI;
    const fallbackUri = process.env.MONGO_URI_FALLBACK || DEFAULT_LOCAL_MONGO_URI;

    try {
      await connectWithUri(primaryUri);
      console.log("Database Connected");
    } catch (primaryError) {
      const shouldFallback =
        process.env.NODE_ENV !== "production" &&
        fallbackUri &&
        fallbackUri !== primaryUri;

      if (!shouldFallback) {
        throw primaryError;
      }

      console.warn(
        "Primary MongoDB connection failed, attempting local fallback:",
        primaryError.message
      );

      await connectWithUri(fallbackUri);
      console.log("Database Connected via fallback URI");
    }

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
