import mongoose from "mongoose";

const feeStructureSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: true,
      trim: true
    },

    academicYear: {
      type: String,
      required: true,
      trim: true
    },

    academicSession: {
      type: String,
      trim: true
    },

    monthlyFee: {
      type: Number,
      default: 0
    },

    admissionFee: {
      type: Number,
      default: 0
    },

    tuitionFee: {
      type: Number,
      default: 0
    },

    computerFee: {
      type: Number,
      default: 0
    },

    examFee: {
      type: Number,
      default: 0
    },

    culturalActivityFee: {
      type: Number,
      default: 0
    },

    totalFee: {
      type: Number,
      default: 0
    },

    // Installments

    juneAmount: {
      type: Number,
      default: 0
    },

    septemberAmount: {
      type: Number,
      default: 0
    },

    decemberAmount: {
      type: Number,
      default: 0
    },

    marchAmount: {
      type: Number,
      default: 0
    },
    isDeleted: {
  type: Boolean,
  default: false
},

deletedAt: {
  type: Date,
  default: null
}
  },
  {
    timestamps: true
  }
);
feeStructureSchema.pre("save", function () {
  if (!this.academicSession && this.academicYear) {
    this.academicSession = this.academicYear;
  }

  if (!this.academicYear && this.academicSession) {
    this.academicYear = this.academicSession;
  }

  this.totalFee =
    this.admissionFee +
    this.tuitionFee +
    this.computerFee +
    this.examFee +
    this.culturalActivityFee;
});
export default mongoose.model(
  "FeeStructure",
  feeStructureSchema
);
