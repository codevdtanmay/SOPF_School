import mongoose from "mongoose";

const transportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true
    },

    routeName: {
      type: String,
      required: true
    },

    pickupPoint: {
      type: String,
      required: true
    },

    monthlyCharge: {
      type: Number,
      required: true
    },

    joiningDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Transport", transportSchema);