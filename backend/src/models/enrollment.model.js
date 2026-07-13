import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true
    },
    // Deprecated compatibility field: school app currently stores class labels as strings.
    class: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    // Deprecated compatibility field: school app currently stores section labels as strings.
    section: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    rollNo: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ["active", "promoted", "left", "alumni", "transferred"],
      default: "active",
      index: true
    },
    promotedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      default: null
    }
  },
  {
    timestamps: true
  }
);

enrollmentSchema.index(
  { student: 1, academicYear: 1 },
  { unique: true }
);

enrollmentSchema.index({ academicYear: 1, class: 1, section: 1, status: 1 });

export default mongoose.model("Enrollment", enrollmentSchema);
