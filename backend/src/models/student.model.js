import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    admissionNo: {
      type: String,
      required: true,
      unique: true
    },

    // Deprecated compatibility fields. Enrollment is the source of truth for class placement.
    class: {
      type: String,
      required: true
    },

    section: {
      type: String,
      default: ""
    },

    rollNo: {
      type: Number,
      required: true
    },

    academicYear: {
      type: String,
      default: ""
    },

    lifecycleStatus: {
      type: String,
      enum: ["Active", "Left", "Alumni", "Transferred"],
      default: "Active"
    },

    fatherName: {
      type: String
    },

    motherName: {
      type: String
    },

    phone: {
      type: String
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male"
    },

    dateOfBirth: {
      type: Date
    },

    joiningDate: {
      type: Date,
      default: Date.now
    },

    category: {
      type: String,
      enum: ["General", "OBC", "SC", "ST"],
      default: "General"
    },

    aadharNo: {
      type: String,
      default: ""
    },

    samagraId: {
      type: String,
      default: ""
    },

    apaarId: {
      type: String,
      default: ""
    },

    panNo: {
      type: String,
      default: ""
    },

    address: {
      village: {
        type: String,
        default: ""
      },

      postOffice: {
        type: String,
        default: ""
      },

      tehsil: {
        type: String,
        default: ""
      },

      district: {
        type: String,
        default: ""
      },

      state: {
        type: String,
        default: ""
      },

      pincode: {
        type: String,
        default: ""
      }
    },

    usesTransport: {
      type: Boolean,
      default: false
    },

    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure"
    },

    totalFee: {
      type: Number,
      default: 0
    },

    paidAmount: {
      type: Number,
      default: 0
    },

    dueAmount: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending"
    },

    

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

    bankDetails: {
  accountHolderName: {
    type: String,
    default: ""
  },
  bankName: {
    type: String,
    default: ""
  },
  accountNumber: {
    type: String,
    default: ""
  },
  ifscCode: {
    type: String,
    default: ""
  },
  branchName: {
    type: String,
    default: ""
  }
}
  },
  {
    timestamps: true
  }
);

studentSchema.index({ class: 1 });
studentSchema.index({ academicYear: 1, class: 1 });
studentSchema.index({ lifecycleStatus: 1 });
studentSchema.index({ category: 1 });
studentSchema.index({ "address.village": 1 });

export default mongoose.model("Student", studentSchema);
