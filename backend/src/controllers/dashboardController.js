import studentModel from "../models/student.model.js";
import teacherModel from "../models/teacherSchema.model.js";
import feePaymentModel from "../models/feePayment.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import feeStructureModel from "../models/feeStructure.js";
import academicYearModel from "../models/academicYear.model.js";
import { resolveAcademicYearQuery } from "../utils/mongoQueryHelpers.js";

const normalizeClassLabel = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const resolveDashboardAcademicYear = async (academicYearInput = "") => {
  const requestedAcademicYear = String(academicYearInput || "").trim();

  if (requestedAcademicYear) {
    const academicYearDoc = await academicYearModel.findOne(
      resolveAcademicYearQuery(requestedAcademicYear)
    );

    return academicYearDoc || null;
  }

  const currentAcademicYear = await academicYearModel.findOne({ isCurrent: true });
  if (currentAcademicYear) {
    return currentAcademicYear;
  }

  return academicYearModel.findOne().sort({ startDate: -1, createdAt: -1 });
};

const getDashboardStats = async (req, res) => {
  try {
    const academicYearDoc = await resolveDashboardAcademicYear(req.query.academicYear);
    const selectedAcademicYear = academicYearDoc?.label || String(req.query.academicYear || "").trim();

    // Student & Teacher Counts
    const totalTeachers = await teacherModel.countDocuments({
      isDeleted: false
    });

    const feeAggregation = await feePaymentModel.aggregate([
      {
        $match: selectedAcademicYear
          ? { academicYear: selectedAcademicYear }
          : {}
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" }
        }
      }
    ]);

    const feesCollected = feeAggregation[0]?.total || 0;

    const enrollments = academicYearDoc
      ? await enrollmentModel
          .find({ academicYear: academicYearDoc._id })
          .populate({
            path: "student",
            match: { isDeleted: false }
          })
      : [];

    const activeEnrollments = enrollments.filter((enrollment) => enrollment.student);
    const totalStudents = academicYearDoc
      ? activeEnrollments.length
      : await studentModel.countDocuments({
          isDeleted: false
        });
    const selectedYearPayments = selectedAcademicYear
      ? await feePaymentModel.aggregate([
          {
            $match: {
              academicYear: selectedAcademicYear
            }
          },
          {
            $group: {
              _id: "$studentId",
              total: { $sum: "$paidAmount" }
            }
          }
        ])
      : [];

    const paymentsByStudentId = new Map(
      selectedYearPayments.map((entry) => [String(entry._id), Number(entry.total || 0)])
    );

    const selectedYearStructures = selectedAcademicYear
      ? await feeStructureModel.find({
          isDeleted: false,
          academicYear: selectedAcademicYear
        })
      : [];

    const paymentSummaries = activeEnrollments.map((enrollment) => {
      const student = enrollment.student;
      const className = String(enrollment.class || student.class || "").trim();
      const normalizedClassName = normalizeClassLabel(className);
      const structure =
        selectedYearStructures.find(
          (item) => normalizeClassLabel(item.class) === normalizedClassName
        ) || null;
      const totalFee = Number(structure?.totalFee || student.totalFee || 0);
      const totalPaid = paymentsByStudentId.get(String(student._id)) || 0;

      return {
        paid: totalPaid >= totalFee,
        partial: totalPaid > 0 && totalPaid < totalFee,
        pending: totalPaid <= 0,
        due: Math.max(0, totalFee - totalPaid)
      };
    });

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
    const academicYearDoc = await resolveDashboardAcademicYear(req.query.academicYear);
    const selectedAcademicYear = academicYearDoc?.label || String(req.query.academicYear || "").trim();

    const feeAggregation = await feePaymentModel.aggregate([
      {
        $match: selectedAcademicYear
          ? { academicYear: selectedAcademicYear }
          : {}
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" }
        }
      }
    ]);

    const collected = feeAggregation[0]?.total || 0;

    const enrollments = academicYearDoc
      ? await enrollmentModel
          .find({ academicYear: academicYearDoc._id })
          .populate({
            path: "student",
            match: { isDeleted: false }
          })
      : [];

    const activeEnrollments = enrollments.filter((enrollment) => enrollment.student);
    const selectedYearPayments = selectedAcademicYear
      ? await feePaymentModel.aggregate([
          {
            $match: {
              academicYear: selectedAcademicYear
            }
          },
          {
            $group: {
              _id: "$studentId",
              total: { $sum: "$paidAmount" }
            }
          }
        ])
      : [];

    const paymentsByStudentId = new Map(
      selectedYearPayments.map((entry) => [String(entry._id), Number(entry.total || 0)])
    );

    const selectedYearStructures = selectedAcademicYear
      ? await feeStructureModel.find({
          isDeleted: false,
          academicYear: selectedAcademicYear
        })
      : [];

    const pendingTotals = activeEnrollments.map((enrollment) => {
      const student = enrollment.student;
      const className = String(enrollment.class || student.class || "").trim();
      const normalizedClassName = normalizeClassLabel(className);
      const structure =
        selectedYearStructures.find(
          (item) => normalizeClassLabel(item.class) === normalizedClassName
        ) || null;
      const totalFee = Number(structure?.totalFee || student.totalFee || 0);
      const totalPaid = paymentsByStudentId.get(String(student._id)) || 0;
      return Math.max(0, totalFee - totalPaid);
    });

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
