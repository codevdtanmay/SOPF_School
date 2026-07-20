import studentModel from "../models/student.model.js";
import feeStructureModel from "../models/feeStructure.js";
import feePaymentModel from "../models/feePayment.model.js";
import academicYearModel from "../models/academicYear.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import mongoose from "mongoose";
import computeInstallmentDetails from "../utils/installmentCalculator.js";
import { sendFeeReceiptMessage, sendFeeReceiptPdfMessage } from "../services/whatsapp.service.js"
import {
  currentMonthLabel,
  normalizeAcademicYear,
  normalizeClassLabel,
  normalizeSectionLabel
} from "../utils/feeLifecycle.js";
import { calculateStudentFee } from "../services/calculateStudentFee.js";
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

const resolveAcademicYearDoc = async (value) => {
  const normalized = normalizeAcademicYear(value);

  if (!normalized) {
    return academicYearModel.findOne({ isCurrent: true });
  }

  return academicYearModel.findOne(resolveAcademicYearQuery(normalized));
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
    const academicYearDoc = await resolveAcademicYearDoc(selectedAcademicYear);
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
    const feeCalculation = await calculateStudentFee(
      {
        ...student.toObject(),
        class: selectedClassName,
        section: selectedSection,
        academicYear: normalizedAcademicYear,
        admissionType: student.admissionType || "new"
      },
      feeStructureForSelectedYear,
      academicYearDoc || normalizedAcademicYear
    );

    const dueAmount = Math.max(0, Number(feeCalculation.finalAmount || 0) - updatedPaid);
    const receiptNo = await buildReceiptNo(paymentDate);

    const snapshot = {
      studentId: student._id,
      studentName: student.userId?.name || "",
      admissionNo: student.admissionNo || "",
      className: selectedClassName,
      section: selectedSection,
      academicYear: normalizedAcademicYear,
      feeStructureId: feeStructureForSelectedYear._id || null,
      feeSnapshot: {
        ...feeCalculation,
        academicYear: feeCalculation.academicYear || academicYearDoc?._id || academicYearDoc || normalizedAcademicYear
      },
      month: paymentMonth,
      amount: paidNow,
      paidAmount: paidNow,
      dueAmount,
      status: dueAmount <= 0 ? "Paid" : updatedPaid > 0 ? "Partial" : "Pending",
      paymentMethod: paymentMethod || "Cash",
      receiptNo,
      paymentDate
    };

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
      feeSnapshot: payment.feeSnapshot
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
        status: payment.status,
        feeSnapshot: payment.feeSnapshot
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

const sendFeeReceiptWhatsapp = async (req, res) => {
  try {
    const { receiptNo } = req.params;

    if (!receiptNo) {
      return res.status(400).json({
        success: false,
        message: "Receipt number is required"
      });
    }

    const payment = await feePaymentModel
      .findOne({ receiptNo })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Fee payment not found"
      });
    }

    const student = payment.studentId?._id
      ? payment.studentId
      : await studentModel.findById(payment.studentId).populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!student.phone) {
      return res.status(400).json({
        success: false,
        message: "Student phone number is missing"
      });
    }

    const phone = student.phone.replace(/\D/g, "").startsWith("91")
      ? student.phone.replace(/\D/g, "")
      : `91${student.phone.replace(/\D/g, "")}`;

    const paymentData = payment.toObject();
    const feeStructureForPaymentYear = await findFeeStructureByCriteria({
      className: payment.className,
      section: payment.section,
      academicYear: payment.academicYear,
      feeStructureId: payment.feeStructureId
    });
    const { totalPaid: cumulativePaid } = await getStudentAnnualPayments(
      payment.studentId?._id || payment.studentId,
      payment.academicYear
    );
    const feeSnapshot = payment.feeSnapshot || null;
    const totalFee = Number(
      feeSnapshot?.finalAmount ??
      feeStructureForPaymentYear?.totalFee ??
      student.totalFee ??
      0
    );
    const dueAmount = Math.max(0, totalFee - cumulativePaid);

    const result = await sendFeeReceiptPdfMessage({
      phone,
      receipt: {
        ...paymentData,
        totalFee,
        paidAmountTotal: cumulativePaid,
        dueAmountRemaining: dueAmount,
        category: student.category || "",
        village: student.address?.village || "",
        feeSnapshot
      }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send fee receipt to WhatsApp",
        error: result.error || null
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee receipt sent to WhatsApp successfully"
    });
  } catch (error) {
    console.error("Fee receipt WhatsApp error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
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
    const academicYearDoc = await resolveAcademicYearDoc(requestedAcademicYear);
    const feeCalculation = await calculateStudentFee(
      {
        ...student.toObject(),
        class: placement.className || student.class || "",
        section: placement.section || student.section || "",
        admissionType: student.admissionType || "new"
      },
      structure,
      academicYearDoc || requestedAcademicYear
    );
    const totalFee = Number(feeCalculation.finalAmount || 0);
    const dueAmount = Math.max(0, totalFee - totalPaid);

    const installments = computeInstallmentDetails(totalPaid, structure);

    return res.status(200).json({
      success: true,
      studentId: student._id,
      studentName: student.userId?.name || "",
      admissionNo: student.admissionNo || "",
      className: feeCalculation.className || placement.className || student.class || "",
      section: feeCalculation.section || placement.section || student.section || "",
      academicYear: requestedAcademicYear,
      admissionType: student.admissionType || "new",
      feeCategory: feeCalculation.feeCategory || String(student.feeCategory || "REGULAR").trim().toUpperCase(),
      totalFee,
      paidAmount: totalPaid,
      dueAmount,
      status: dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending",
      feeSnapshot: feeCalculation,
      payments,
      installments
    });
  } catch (error) {
    console.error(error);

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
    console.error(error);

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
        const studentAcademicYearDoc = await resolveAcademicYearDoc(student.academicYear);
        const structure = await findMatchingFeeStructure({
          ...student.toObject(),
          class: placement.className,
          section: placement.section,
          academicYear: student.academicYear
        });
        const { totalPaid } = await getStudentAnnualPayments(student._id, student.academicYear);
        const feeCalculation = structure
          ? await calculateStudentFee(
      {
        ...student.toObject(),
        admissionType: student.admissionType || "new"
      },
      structure,
      studentAcademicYearDoc || student.academicYear
            )
          : null;
        const totalFee = Number(
          feeCalculation?.finalAmount ??
          structure?.totalFee ??
          student.totalFee ??
          0
        );
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
    console.error(error);

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
      admissionType,
      feeCategory,
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

    if (admissionType && admissionType !== "All") {
      rows = rows.filter(({ student }) => String(student.admissionType || "new") === admissionType);
    }

    if (feeCategory && feeCategory !== "All") {
      const normalizedFeeCategory = String(feeCategory || "REGULAR").trim().toUpperCase();
      rows = rows.filter(({ student }) => String(student.feeCategory || "REGULAR").trim().toUpperCase() === normalizedFeeCategory);
    }

    const totalStudents = rows.length;
    const skip = (Number(page) - 1) * Number(limit);
    rows = rows.slice(skip, skip + Number(limit));

    const formattedData = await Promise.all(
      rows.map(async ({ enrollment, student, className, sectionName, academicYearLabel, rollNo }) => {
        const academicYearDocForRow = academicYearDoc || await resolveAcademicYearDoc(academicYearLabel);
        const admissionTypeForRow = student.admissionType || "new";
        const structure = await findMatchingFeeStructure({
          ...student.toObject(),
          class: className,
          section: sectionName,
          academicYear: academicYearLabel
        });
        const { totalPaid, payments } = await getStudentAnnualPayments(student._id, academicYearLabel);
        const feeCalculation = structure
          ? await calculateStudentFee(
            {
              ...student.toObject(),
                admissionType: admissionTypeForRow
              },
              structure,
              academicYearDocForRow || academicYearLabel
            )
          : null;
        const totalFee = Number(
          feeCalculation?.finalAmount ??
          structure?.totalFee ??
          student.totalFee ??
          0
        );
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
          month: payment.month,
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
          admissionType: admissionTypeForRow,
          feeCategory: String(student.feeCategory || "REGULAR").trim().toUpperCase(),
          feeSnapshot: feeCalculation,
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
    const admissionTypeFilteredData = admissionType && admissionType !== "All"
      ? filteredData.filter((row) => row.admissionType === admissionType)
      : filteredData;

    return res.status(200).json({
      success: true,
      students: admissionTypeFilteredData,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(admissionTypeFilteredData.length / Number(limit)),
        totalStudents: admissionTypeFilteredData.length,
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error(error);

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
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export default {
  collectFee,
  sendFeeReceiptWhatsapp,
  getStudentFeeDetails,
  getPaymentHistory,
  getFeeDashboard,
  getAllFees,
  getMonthlyFeeReport
};
