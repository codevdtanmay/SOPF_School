import mongoose from "mongoose";

const feeStructureSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: true,
      trim: true
    },

    academicSession: {
      type: String,
      required: true
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