import mongoose from "mongoose";

export const resolveAcademicYearQuery = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const conditions = [{ label: normalized }];

  if (mongoose.isValidObjectId(normalized)) {
    conditions.push({ _id: normalized });
  }

  return { $or: conditions };
};
