import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
      immutable: true
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
      immutable: true
    },

    admissionNo: {
      type: String,
      required: true,
      trim: true,
      immutable: true
    },

    className: {
      type: String,
      required: true,
      trim: true,
      immutable: true
    },

    section: {
      type: String,
      default: "",
      trim: true,
      immutable: true
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
      index: true,
      immutable: true
    },

    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
      index: true,
      immutable: true
    },

    feeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      immutable: true
    },

    month: {
      type: String,
      required: true,
      trim: true,
      index: true,
      immutable: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true
    },

    paidAmount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true
    },

    dueAmount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true
    },

    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      required: true,
      default: "Pending",
      immutable: true
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer"],
      required: true,
      default: "Cash",
      immutable: true
    },

    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true
    },

    migrationSource: {
      type: String,
      default: "",
      immutable: true
    }
  },
  {
    timestamps: true
  }
);

feePaymentSchema.index({ studentId: 1, academicYear: 1, month: 1 });
feePaymentSchema.index({ academicYear: 1, month: 1, paymentDate: -1 });
feePaymentSchema.index({ studentId: 1, academicYear: 1, feeStructureId: 1 });

export default mongoose.model("FeePayment", feePaymentSchema);
