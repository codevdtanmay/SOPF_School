import studentModel from "../models/student.model.js";
import teacherModel from "../models/teacherSchema.model.js";
import feePaymentModel from "../models/feePayment.model.js";

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
    const students = await studentModel.find({ isDeleted: false });

    const feeAggregation = await feePaymentModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" }
        }
      }
    ]);

    const feesCollected = feeAggregation[0]?.total || 0;

    // Pending Fees
    const paymentSummaries = await Promise.all(
      students.map(async (student) => {
        const annualPaidAggregation = await feePaymentModel.aggregate([
          {
            $match: {
              studentId: student._id,
              academicYear: student.academicYear
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$paidAmount" }
            }
          }
        ]);

        const totalPaid = annualPaidAggregation[0]?.total || 0;
        return {
          paid: totalPaid >= (student.totalFee || 0),
          partial: totalPaid > 0 && totalPaid < (student.totalFee || 0),
          pending: totalPaid <= 0,
          due: Math.max(0, (student.totalFee || 0) - totalPaid)
        };
      })
    );

    const pendingFees = paymentSummaries.reduce((sum, item) => sum + item.due, 0);
    const paidStudents = paymentSummaries.filter((item) => item.paid).length;
    const partialStudents = paymentSummaries.filter((item) => item.partial).length;
    const pendingStudents = paymentSummaries.filter((item) => item.pending).length;

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
      { isDeleted: false }
    );

    const feeAggregation = await feePaymentModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" }
        }
      }
    ]);

    const collected = feeAggregation[0]?.total || 0;

    const pendingTotals = await Promise.all(
      students.map(async (student) => {
        const annualPaidAggregation = await feePaymentModel.aggregate([
          {
            $match: {
              studentId: student._id,
              academicYear: student.academicYear
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$paidAmount" }
            }
          }
        ]);
        const totalPaid = annualPaidAggregation[0]?.total || 0;
        return Math.max(0, (student.totalFee || 0) - totalPaid);
      })
    );

    const pending = pendingTotals.reduce((sum, value) => sum + value, 0);

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
