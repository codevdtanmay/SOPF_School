import studentModel from "../models/student.model.js";
import teacherModel from "../models/teacherSchema.model.js";
import feeModel from "../models/feeHistory.model.js"; // <-- Change this if your filename is different

const getDashboardStats = async (req, res) => {
  try {
    // Student & Teacher Counts
    const totalStudents = await studentModel.countDocuments({
      isDeleted: false
    });

    const totalTeachers = await teacherModel.countDocuments({
      isDeleted: false
    });

    // Students (for pending fees & status)
    const students = await studentModel.find(
      { isDeleted: false },
      "dueAmount status"
    );

    // Total Fees Collected (from Fee collection)
    const feeAggregation = await feeModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const feesCollected = feeAggregation[0]?.total || 0;

    // Pending Fees
    const pendingFees = students.reduce(
      (sum, student) => sum + (student.dueAmount || 0),
      0
    );

    // Status Counts
    const paidStudents = students.filter(
      (student) => student.status === "Paid"
    ).length;

    const partialStudents = students.filter(
      (student) => student.status === "Partial"
    ).length;

    const pendingStudents = students.filter(
      (student) => student.status === "Pending"
    ).length;

    return res.status(200).json({
      success: true,

      totalStudents,
      totalTeachers,

      feesCollected,
      pendingFees,

      paidStudents,
      partialStudents,
      pendingStudents
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getFeeSummary = async (req, res) => {
  try {
    const students = await studentModel.find(
      { isDeleted: false },
      "dueAmount"
    );

    const feeAggregation = await feeModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const collected = feeAggregation[0]?.total || 0;

    const pending = students.reduce(
      (sum, student) => sum + (student.dueAmount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      collected,
      pending,
      total: collected + pending
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getActivities = async (req, res) => {
  try {
    const students = await studentModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name");

    const activities = students.map((student) => ({
      activity: `New student ${student.userId?.name} admitted`,
      time: student.createdAt
    }));

    return res.status(200).json({
      success: true,
      activities
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export default {
  getDashboardStats,
  getFeeSummary,
  getActivities
};