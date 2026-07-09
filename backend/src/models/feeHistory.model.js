import mongoose from "mongoose";

const feeHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer"],
      required: true
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Helpful indexes
feeHistorySchema.index({ studentId: 1, paymentDate: -1 });
feeHistorySchema.index({ paymentDate: -1 });

export default mongoose.model("FeeHistory", feeHistorySchema);