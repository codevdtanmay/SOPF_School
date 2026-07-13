import studentModel from "../models/student.model.js";
import feeStructureModel from "../models/feeStructure.js";
import feePaymentModel from "../models/feePayment.model.js";
import academicYearModel from "../models/academicYear.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import mongoose from "mongoose";
import computeInstallmentDetails from "../utils/installmentCalculator.js";
import { sendFeeReceiptMessage } from "../services/whatsapp.service.js"
import {
  buildFeePaymentSnapshot,
  currentMonthLabel,
  normalizeAcademicYear,
  normalizeClassLabel,
  normalizeSectionLabel
} from "../utils/feeLifecycle.js";
import { resolveStudentPlacement } from "../utils/studentPlacement.js";
import { resolveAcademicYearQuery } from "../utils/mongoQueryHelpers.js";

const MONTH_LABELS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const findFeeStructureByCriteria = async ({
  student = null,
  className = "",
  section = "",
  academicYear = "",
  feeStructureId = null
} = {}) => {
  const normalizedClassName = normalizeClassLabel(
    className || student?.class || ""
  );
  const normalizedSection = normalizeSectionLabel(section || student?.section || "");
  const normalizedAcademicYear = normalizeAcademicYear(
    academicYear || student?.academicYear || ""
  );
  const assignedFeeStructureId = feeStructureId || student?.feeStructureId || null;

  if (assignedFeeStructureId) {
    const assignedStructure = await feeStructureModel.findOne({
      _id: assignedFeeStructureId,
      isDeleted: false
    });

    if (assignedStructure) {
      if (!normalizedAcademicYear || normalizeAcademicYear(assignedStructure.academicYear) === normalizedAcademicYear) {
        return assignedStructure;
      }
    }
  }

  if (!normalizedClassName) {
    return null;
  }

  if (normalizedAcademicYear) {
    const yearStructures = await feeStructureModel.find({
      isDeleted: false,
      academicYear: normalizedAcademicYear
    });

    const matchedYearStructure = yearStructures.find(
      (feeStructure) =>
        normalizeClassLabel(feeStructure.class) === normalizedClassName &&
        (!normalizedSection ||
          normalizeSectionLabel(feeStructure.section) === normalizedSection ||
          !normalizeSectionLabel(feeStructure.section))
    );

    if (matchedYearStructure) {
      return matchedYearStructure;
    }
  }

  const activeStructures = await feeStructureModel.find({
    isDeleted: false,
    ...(normalizedSection
      ? {
          $or: [
            { section: normalizedSection },
            { section: "" },
            { section: null },
            { section: { $exists: false } }
          ]
        }
      : {})
  });

  const sortedStructures = activeStructures.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  if (!normalizedSection) {
    return (
      sortedStructures.find(
        (feeStructure) => normalizeClassLabel(feeStructure.class) === normalizedClassName
      ) || null
    );
  }

  return (
    sortedStructures.find(
      (feeStructure) =>
        normalizeClassLabel(feeStructure.class) === normalizedClassName &&
        (normalizeSectionLabel(feeStructure.section) === normalizedSection ||
          !normalizeSectionLabel(feeStructure.section))
    ) || null
  );
};

const findMatchingFeeStructure = async (student) =>
  findFeeStructureByCriteria({ student });

const formatReceiptSequence = (value) => String(value).padStart(5, "0");

const buildReceiptNo = async (paymentDate = new Date()) => {
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
  const startOfMonth = new Date(year, paymentDate.getMonth(), 1);
  const startOfNextMonth = new Date(year, paymentDate.getMonth() + 1, 1);

  const monthlyCount = await feePaymentModel.countDocuments({
    paymentDate: {
      $gte: startOfMonth,
      $lt: startOfNextMonth
    }
  });

  return `REC-${year}${month}-${formatReceiptSequence(monthlyCount + 1)}`;
};

const createPaymentWithMonthlyReceipt = async (snapshot, paymentDate) => {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const receiptNo = await buildReceiptNo(paymentDate);

    try {
      return await feePaymentModel.create({
        ...snapshot,
        receiptNo
      });
    } catch (error) {
      const duplicateReceiptNo =
        error?.code === 11000 &&
        (error?.keyValue?.receiptNo || Object.keys(error.keyValue || {})[0] === "receiptNo");

      if (!duplicateReceiptNo || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unable to allocate receipt number");
};

const getStudentAnnualPayments = async (studentId, academicYear) => {
  const payments = await feePaymentModel
    .find({
      studentId,
      academicYear: normalizeAcademicYear(academicYear)
    })
    .sort({ paymentDate: 1, createdAt: 1 });

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0),
    0
  );

  return { payments, totalPaid };
};

const hydrateLegacyFeePayment = async (payment) => {
  if (!payment) {
    return null;
  }

  const needsBackfill =
    !payment.studentName ||
    !payment.admissionNo ||
    !payment.className ||
    payment.section == null ||
    !payment.academicYear ||
    !payment.feeStructureId;

  if (!needsBackfill) {
    return payment;
  }

  const student = await studentModel
    .findById(payment.studentId)
    .populate("userId", "name email");

  if (!student) {
    return payment;
  }

  const placement = await resolveStudentPlacement(student, payment.academicYear || student.academicYear);
  const snapshot = {
    studentName: payment.studentName || student.userId?.name || "",
    admissionNo: payment.admissionNo || student.admissionNo || "",
    className: payment.className || placement.className || "",
    section: payment.section || placement.section || "",
    academicYear: payment.academicYear || normalizeAcademicYear(student.academicYear),
    feeStructureId: payment.feeStructureId || student.feeStructureId || null
  };

  await feePaymentModel.updateOne(
    { _id: payment._id },
    {
      $set: snapshot
    }
  );

  return {
    ...payment.toObject(),
    ...snapshot
  };
};

const collectFee = async (req, res) => {
  try {
    const { studentId, amountPaid, paymentMethod, month, academicYear, className, section } = req.body;

    if (!studentId || Number(amountPaid) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid student ID and payment amount are required"
      });
    }

    const student = await studentModel
      .findById(studentId)
      .populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const selectedAcademicYear = normalizeAcademicYear(academicYear || student.academicYear);
    const placement = await resolveStudentPlacement(student, academicYear || student.academicYear);
    const selectedClassName = String(className || placement.className || "").trim();
    const selectedSection = String(section || placement.section || "").trim();

    const feeStructureForSelectedYear = await findFeeStructureByCriteria({
      className: selectedClassName,
      section: selectedSection,
      academicYear: selectedAcademicYear,
      feeStructureId: student.feeStructureId
    });

    if (!feeStructureForSelectedYear) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found for the selected academic year"
      });
    }

    const paymentDate = new Date();
    const normalizedAcademicYear = selectedAcademicYear || normalizeAcademicYear(student.academicYear);
    const paymentMonth = String(month || currentMonthLabel(paymentDate)).trim();
    const paidNow = Number(amountPaid);

    const { totalPaid } = await getStudentAnnualPayments(student._id, normalizedAcademicYear);
    const updatedPaid = totalPaid + paidNow;
    const dueAmount = Math.max(0, Number(feeStructureForSelectedYear.totalFee || 0) - updatedPaid);

    const paymentStudent = {
      ...student.toObject(),
      class: selectedClassName,
      section: selectedSection,
      academicYear: normalizedAcademicYear,
      currentEnrollment: student.currentEnrollment || null
    };

    const receiptNo = await buildReceiptNo(paymentDate);

    const snapshot = buildFeePaymentSnapshot({
      student: paymentStudent,
      feeStructure: feeStructureForSelectedYear,
      amountPaid: paidNow,
      paymentMethod: paymentMethod || "Cash",
      receiptNo,
      paymentDate,
      month: paymentMonth,
      paidAmount: paidNow,
      dueAmount,
      status: dueAmount <= 0 ? "Paid" : updatedPaid > 0 ? "Partial" : "Pending"
    });

    const payment = await createPaymentWithMonthlyReceipt(snapshot, paymentDate).catch((error) => {
      if (error?.code === 11000) {
        const duplicateField = Object.keys(error.keyValue || {})[0] || "receiptNo";
        const duplicateValue = error.keyValue?.[duplicateField];
        const duplicateError = new Error(
          `Duplicate ${duplicateField}${duplicateValue ? `: ${duplicateValue}` : ""}`
        );
        duplicateError.statusCode = 409;
        throw duplicateError;
      }

      throw error;
    });
try {
  if (student.phone) {
    await sendFeeReceiptMessage({
  phone: student.phone.startsWith("91")
    ? student.phone
    : `91${student.phone}`,
  studentName: payment.studentName,
  admissionNo: payment.admissionNo,
  className: payment.className,
  section: payment.section,
  academicYear: payment.academicYear,
  installment: payment.month,
  paidAmount: payment.paidAmount,
  dueAmount: payment.dueAmount,
  paymentMethod: payment.paymentMethod,
  receiptNo: payment.receiptNo,
});
  }
} catch (err) {
  console.error("WhatsApp Error:", err);
}

    return res.status(200).json({
      success: true,
      message: "Fee Collected Successfully",
      receiptNo: payment.receiptNo,
      receiptDetail: {
        receiptNo: payment.receiptNo,
        studentName: payment.studentName,
        admissionNo: payment.admissionNo,
        className: payment.className,
        section: payment.section,
        academicYear: payment.academicYear,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        dueAmount: payment.dueAmount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        month: payment.month,
        status: payment.status
      },
      payment: payment.toObject()
    });
  } catch (error) {
    console.error("Fee collection error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

const getStudentFeeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentModel.findById(id).populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const placement = await resolveStudentPlacement(student, req.query?.academicYear || student.academicYear);
    const requestedAcademicYear = normalizeAcademicYear(
      req.query?.academicYear || placement.academicYear || student.academicYear
    );
    const structure = await findFeeStructureByCriteria({
      student,
      academicYear: requestedAcademicYear
    });

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found"
      });
    }

    const { totalPaid, payments } = await getStudentAnnualPayments(
      student._id,
      requestedAcademicYear
    );

    const totalFee = Number(structure.totalFee || 0);
    const dueAmount = Math.max(0, totalFee - totalPaid);

    const installments = computeInstallmentDetails(totalPaid, structure);

    return res.status(200).json({
      success: true,
      totalFee,
      paidAmount: totalPaid,
      dueAmount,
      status: dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending",
      academicYear: requestedAcademicYear,
      payments,
      installments
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentModel.findById(id).populate("userId", "name");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const rawHistory = await feePaymentModel
      .find({ studentId: id })
      .sort({ paymentDate: -1, createdAt: -1 });

    const history = await Promise.all(rawHistory.map(hydrateLegacyFeePayment));

    return res.status(200).json({
      success: true,
      studentName: student.userId?.name || "",
      admissionNo: student.admissionNo,
      history
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getFeeDashboard = async (_req, res) => {
  try {
    const students = await studentModel.find({ isDeleted: false });

    const totalStudents = students.length;
    const activeStudentIds = students.map((student) => student._id);

    const totalCollectedAggregation = await feePaymentModel.aggregate([
      { $match: { studentId: { $in: activeStudentIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" }
        }
      }
    ]);

    const totalCollected = totalCollectedAggregation[0]?.total || 0;

    const feeSummaries = await Promise.all(
      students.map(async (student) => {
        const placement = await resolveStudentPlacement(student, student.academicYear);
        const structure = await findMatchingFeeStructure({
          ...student.toObject(),
          class: placement.className,
          section: placement.section,
          academicYear: student.academicYear
        });
        const { totalPaid } = await getStudentAnnualPayments(student._id, student.academicYear);
        const totalFee = Number(structure?.totalFee || student.totalFee || 0);
        const dueAmount = Math.max(0, totalFee - totalPaid);

        return {
          dueAmount,
          status: dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending"
        };
      })
    );

    const totalPending = feeSummaries.reduce((sum, item) => sum + item.dueAmount, 0);
    const studentsWithDue = feeSummaries.filter((item) => item.dueAmount > 0).length;
    const fullyPaidStudents = feeSummaries.filter((item) => item.status === "Paid").length;

    return res.status(200).json({
      success: true,
      totalStudents,
      totalCollected,
      totalPending,
      studentsWithDue,
      fullyPaidStudents
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getAllFees = async (req, res) => {
  try {
    const {
      status,
      class: studentClass,
      section,
      academicYear,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const requestedAcademicYearInput = normalizeAcademicYear(academicYear);
    let academicYearDoc = null;

    if (requestedAcademicYearInput) {
      academicYearDoc = await academicYearModel.findOne(resolveAcademicYearQuery(requestedAcademicYearInput));
    } else {
      // No academic year specified, use current
      academicYearDoc = await academicYearModel.findOne({ isCurrent: true });
    }

    if (requestedAcademicYearInput && !academicYearDoc) {
      return res.status(400).json({
        success: false,
        message: `Academic year "${requestedAcademicYearInput}" does not exist`
      });
    }

    const enrollmentQuery = {
      status: "active",
      ...(academicYearDoc ? { academicYear: academicYearDoc._id } : {})
    };

    if (studentClass && studentClass !== "All") {
      enrollmentQuery.class = studentClass;
    }

    if (section && section !== "All") {
      enrollmentQuery.section = section;
    }

    const enrollments = await enrollmentModel
      .find(enrollmentQuery)
      .populate({
        path: "student",
        match: { isDeleted: false },
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .populate("academicYear", "label isCurrent")
      .sort({ class: 1, section: 1, rollNo: 1, createdAt: 1 });

    let rows = enrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => ({
        enrollment,
        student: enrollment.student,
        className: enrollment.class || "",
        sectionName: enrollment.section || "",
        academicYearLabel: enrollment.academicYear?.label || academicYearDoc?.label || requestedAcademicYearInput || "",
        rollNo: enrollment.rollNo ?? enrollment.student?.rollNo ?? null
      }));

    if (search) {
      const keyword = search.toLowerCase();
      rows = rows.filter(({ student }) =>
        student.userId?.name?.toLowerCase().includes(keyword) ||
        student.admissionNo?.toLowerCase().includes(keyword)
      );
    }

    const totalStudents = rows.length;
    const skip = (Number(page) - 1) * Number(limit);
    rows = rows.slice(skip, skip + Number(limit));

    const formattedData = await Promise.all(
      rows.map(async ({ enrollment, student, className, sectionName, academicYearLabel, rollNo }) => {
        const structure = await findMatchingFeeStructure({
          ...student.toObject(),
          class: className,
          section: sectionName,
          academicYear: academicYearLabel
        });
        const { totalPaid, payments } = await getStudentAnnualPayments(student._id, academicYearLabel);
        const totalFee = Number(structure?.totalFee || student.totalFee || 0);
        const dueAmount = Math.max(0, totalFee - totalPaid);
        const currentStatus = dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending";

        const paymentHistory = payments.map((payment) => ({
          id: payment._id,
          receiptNo: payment.receiptNo,
          date: payment.paymentDate,
          amount: payment.amount,
          paidAmount: payment.paidAmount,
          dueAmount: payment.dueAmount,
          paymentMethod: payment.paymentMethod,
          className: payment.className,
          section: payment.section,
          academicYear: payment.academicYear
        }));

        return {
          studentId: student._id,
          name: student.userId?.name || "",
          email: student.userId?.email || "",
          admissionNo: student.admissionNo,
          class: className,
          section: sectionName,
          className,
          academicYear: academicYearLabel,
          rollNo,
          totalFee,
          paidAmount: totalPaid,
          dueAmount,
          status: currentStatus,
          paymentHistory
        };
      })
    );

    const filteredData = status && status !== "All"
      ? formattedData.filter((row) => row.status === status)
      : formattedData;

    return res.status(200).json({
      success: true,
      students: filteredData,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalStudents / Number(limit)),
        totalStudents,
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getMonthlyFeeReport = async (req, res) => {
  try {
    const now = new Date();
    const rawMonth = String(req.query.month || currentMonthLabel(now)).trim();
    const month = /^\d+$/.test(rawMonth) ? MONTH_LABELS[Number(rawMonth)] || rawMonth : rawMonth;
    const academicYear = normalizeAcademicYear(req.query.academicYear);
    const year = Number(req.query.year) || now.getFullYear();

    const query = {};

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (month) {
      query.month = month;
    }

    if (req.query.year) {
      query.paymentDate = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      };
    }

    const rawPayments = await feePaymentModel
      .find(query)
      .sort({ paymentDate: -1, createdAt: -1 });

    const payments = await Promise.all(rawPayments.map(hydrateLegacyFeePayment));

    const totalCollection = payments.reduce(
      (sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      month,
      year,
      academicYear,
      totalCollection,
      totalTransactions: payments.length,
      payments
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export default {
  collectFee,
  getStudentFeeDetails,
  getPaymentHistory,
  getFeeDashboard,
  getAllFees,
  getMonthlyFeeReport
};
