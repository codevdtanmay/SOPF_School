import mongoose from "mongoose";

const transportPaymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    transportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
      required: true
    },

    receiptNo: {
      type: String,
      required: true,
      unique: true
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },

    year: {
      type: Number,
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer"
      ],
      default: "Cash"
    },

    paymentDate: {
      type: Date,
      default: Date.now
    },

    remarks: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

transportPaymentSchema.index({
  studentId: 1,
  month: 1,
  year: 1
});

export default mongoose.model(
  "TransportPayment",
  transportPaymentSchema
);