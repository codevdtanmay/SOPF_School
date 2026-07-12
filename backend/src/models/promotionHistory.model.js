import mongoose from "mongoose";

const promotionHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    promotionDate: {
      type: Date,
      default: Date.now,
      index: true
    },

    oldClass: {
      type: String,
      required: true
    },

    newClass: {
      type: String,
      required: true
    },

    oldSection: {
      type: String,
      default: ""
    },

    newSection: {
      type: String,
      default: ""
    },

    oldAcademicYear: {
      type: String,
      required: true
    },

    newAcademicYear: {
      type: String,
      required: true
    },

    reason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

promotionHistorySchema.index({ studentId: 1, promotionDate: -1 });
promotionHistorySchema.index({ promotionDate: -1 });

export default mongoose.model("PromotionHistory", promotionHistorySchema);
