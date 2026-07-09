import mongoose from "mongoose";

const tcSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    tcNumber: {
      type: String,
      required: true,
      unique: true
    },

    issueDate: {
      type: String,
      required: true
    },

    reason: {
      type: String,
      required: true
    },

    conduct: {
      type: String,
      default: "Good"
    },

    lastAttendanceDate: {
      type: String,
      required: true
    },

    admissionDate: {
      type: String
    },

    classLeaving: {
      type: String,
      required: true
    },

    promotedTo: {
      type: String,
      default: ""
    },

    remarks: {
      type: String,
      default: ""
    },

    issuedBy: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["Issued", "Cancelled"],
      default: "Issued"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("TransferCertificate", tcSchema);