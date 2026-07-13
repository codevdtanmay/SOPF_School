import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isCurrent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Only one academic year should be marked current at a time.
academicYearSchema.index(
  { isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true }
  }
);

export default mongoose.model("AcademicYear", academicYearSchema);
