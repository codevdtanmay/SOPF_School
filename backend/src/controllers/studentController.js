import studentModel from "../models/student.model.js";
import userModel from "../models/userSchema.model.js";
import feeStructureModel from "../models/feeStructure.js";
import feePaymentModel from "../models/feePayment.model.js";
import promotionHistoryModel from "../models/promotionHistory.model.js";
import academicYearModel from "../models/academicYear.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { normalizeAcademicYear, normalizeClassLabel, buildClassName, academicYearSortValue } from "../utils/feeLifecycle.js";
import { getCurrentAcademicYearDoc, resolveStudentPlacementSync } from "../utils/studentPlacement.js";
import { resolveAcademicYearQuery } from "../utils/mongoQueryHelpers.js";

const DEFAULT_ACADEMIC_SESSION = `${new Date().getFullYear()}-${String(
  new Date().getFullYear() + 1
).slice(-2)}`;

const findMatchingFeeStructure = async (studentClass, academicYear = "") => {
  const normalizedStudentClass = normalizeClassLabel(studentClass);
  const normalizedAcademicYear = normalizeAcademicYear(academicYear);

  if (!normalizedStudentClass || !normalizedAcademicYear) {
    return null;
  }

  const exactMatch = await feeStructureModel.findOne({
    isDeleted: false,
    class: new RegExp(`^${escapeRegex(String(studentClass || "").trim())}$`, "i"),
    academicYear: normalizedAcademicYear
  });

  if (exactMatch) {
    return exactMatch;
  }

  const feeStructures = await feeStructureModel
    .find({
      isDeleted: false,
      academicYear: normalizedAcademicYear
    })
    .sort({ createdAt: -1 });

  return (
    feeStructures.find(
      (feeStructure) =>
        normalizeClassLabel(feeStructure.class) === normalizedStudentClass
    ) || null
  );
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeAcademicSession = (value) =>
  String(value || "").trim();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeOptionalDate = (value) => {
  const normalized = String(value || "").trim();
  return normalized ? normalized : undefined;
};

const academicSessionSortValue = (value) => {
  return academicYearSortValue(value);
};

const getAvailableAcademicSessions = async () => {
  const sessions = await academicYearModel.find().sort({ isCurrent: -1, startDate: -1, createdAt: -1 });
  return sessions.map((item) => normalizeAcademicSession(item.label)).filter(Boolean);
};

const buildClassLabel = (studentClass) =>
  String(studentClass || "");

const getCurrentAcademicYear = async () => {
  const academicYearDoc = await getCurrentAcademicYearDoc();
  return normalizeAcademicSession(academicYearDoc?.label);
};

const getEnrollmentPlacement = async (studentId, academicYearLabel = "") => {
  const academicYearDoc = await academicYearModel.findOne(
    resolveAcademicYearQuery(normalizeAcademicSession(academicYearLabel))
  );

  if (!academicYearDoc) {
    return null;
  }

  return enrollmentModel
    .findOne({
      student: studentId,
      academicYear: academicYearDoc._id,
      status: "active"
    })
    .populate("academicYear", "label isCurrent");
};

const MONTH_SEQUENCE = [
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March"
];

const matchesNormalizedClass = (value, filter) =>
  !String(filter || "").trim() ||
  normalizeClassLabel(value) === normalizeClassLabel(filter);

const matchesNormalizedSection = (value, filter) =>
  !String(filter || "").trim() ||
  normalizeSectionLabel(value) === normalizeSectionLabel(filter);

const buildMonthlyInstallments = (payments = []) => {
  const groupedPayments = payments.reduce((acc, payment) => {
    const month = String(payment.month || "").trim();
    if (!month) {
      return acc;
    }

    if (!acc[month]) {
      acc[month] = [];
    }

    acc[month].push(payment);
    return acc;
  }, {});

  return MONTH_SEQUENCE.map((month) => {
    const monthPayments = groupedPayments[month] || [];
    const paidAmount = monthPayments.reduce(
      (sum, payment) => sum + Number(payment.paidAmount ?? payment.amount ?? 0),
      0
    );
    const lastPayment = monthPayments[monthPayments.length - 1] || null;
    const dueAmount = Number(lastPayment?.dueAmount ?? 0);
    const status = lastPayment
      ? dueAmount <= 0
        ? "Paid"
        : paidAmount > 0
          ? "Partial"
          : "Pending"
      : "Pending";

    return {
      month,
      status,
      paidAmount,
      dueAmount,
      receipts: monthPayments.map((payment) => ({
        receiptNo: payment.receiptNo || "",
        paymentDate: payment.paymentDate || payment.createdAt || "",
        amount: Number(payment.amount ?? payment.paidAmount ?? 0),
        paymentMethod: payment.paymentMethod || "Cash",
        academicYear: payment.academicYear || "",
        className: payment.className || ""
      }))
    };
  });
};


// =========================
// ADD STUDENT
// =========================

const addStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,

      admissionNo,
      class: studentClass,
      rollNo,
      academicYear,
      lifecycleStatus,

      fatherName,
      motherName,
      phone,

      gender,
      dateOfBirth,
      joiningDate,

      category,

      aadharNo,
      samagraId,
      apaarId,
      panNo,
      bankDetails,
      usesTransport,

      address
    } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedAdmissionNo = String(admissionNo || "").trim();
    const normalizedStudentClass = String(studentClass || "").trim();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    if (!normalizedAdmissionNo) {
      return res.status(400).json({
        success: false,
        message: "Admission number is required"
      });
    }

    if (!normalizedStudentClass) {
      return res.status(400).json({
        success: false,
        message: "Class is required"
      });
    }

    // Email Exists
    const userExists = await userModel.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    const admissionExists = await studentModel.findOne({ admissionNo: normalizedAdmissionNo });
    if (admissionExists) {
      return res.status(409).json({
        success: false,
        message: "Admission number already exists"
      });
    }

    // Aadhaar Validation
    if (aadharNo && !/^\d{12}$/.test(aadharNo)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar number must be 12 digits"
      });
    }

    // Phone Validation
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits"
      });
    }

    // PAN Validation
    if (panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN number"
      });
    }

    // Pincode Validation
    if (address?.pincode && !/^\d{6}$/.test(address.pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Pincode"
      });
    }

    // Unique Checks

    if (aadharNo) {
      const exists = await studentModel.findOne({ aadharNo });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Aadhaar already exists"
        });
      }
    }

    if (samagraId) {
      const exists = await studentModel.findOne({ samagraId });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Samagra ID already exists"
        });
      }
    }

    if (apaarId) {
      const exists = await studentModel.findOne({ apaarId });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "APAAR ID already exists"
        });
      }
    }

    const resolvedAcademicYear =
      normalizeAcademicSession(academicYear) || (await getCurrentAcademicYear()) || DEFAULT_ACADEMIC_SESSION;
    let academicYearDoc = await academicYearModel.findOne(resolveAcademicYearQuery(resolvedAcademicYear));

    if (!academicYearDoc) {
      academicYearDoc = await getCurrentAcademicYearDoc();
    }

    // Fee Structure

    const feeStructure = await findMatchingFeeStructure(studentClass, resolvedAcademicYear);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: `Fee Structure not found for class "${studentClass}" in academic year "${resolvedAcademicYear}"`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const transportValue =
      usesTransport === true || usesTransport === "Yes";
    const addSession = await mongoose.startSession();
    let student;

    try {
      await addSession.withTransaction(async () => {
        const user = await userModel.create([{
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "student"
        }], { session: addSession });

        const createdStudent = await studentModel.create([{
          userId: user[0]._id,

          admissionNo: normalizedAdmissionNo,

          class: normalizedStudentClass,
          rollNo,
          academicYear: resolvedAcademicYear,
          section: String(req.body.section || "").trim(),
          lifecycleStatus: lifecycleStatus || "Active",

          fatherName,
          motherName,
          phone,

          gender,
          dateOfBirth: normalizeOptionalDate(dateOfBirth),
          joiningDate: normalizeOptionalDate(joiningDate),

          category,

          aadharNo,
          samagraId,
          apaarId,
          panNo,
          bankDetails,
          usesTransport: transportValue,
          address,

          feeStructureId: feeStructure._id,
          totalFee: feeStructure.totalFee,
          paidAmount: 0,
          dueAmount: feeStructure.totalFee,
          status: "Pending"
        }], { session: addSession });

        student = createdStudent[0];

        if (academicYearDoc) {
          await enrollmentModel.create([{
            student: student._id,
            academicYear: academicYearDoc._id,
            class: studentClass,
            section: String(req.body.section || "").trim(),
            rollNo: rollNo ? Number(rollNo) : null,
            status: "active"
          }], { session: addSession });
        }
      });
    } finally {
      await addSession.endSession();
    }

    const populatedStudent = await studentModel
      .findById(student._id)
      .populate("userId", "name email");

    return res.status(201).json({
      success: true,
      message: "Student Added Successfully",
      student: populatedStudent
    });

  } catch (error) {
    console.error(error);

    if (error?.name === "ValidationError") {
      const message = Object.values(error.errors || {})
        .map((err) => err?.message)
        .filter(Boolean)
        .join(", ") || "Validation failed";

      return res.status(400).json({
        success: false,
        message
      });
    }

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path || "value"}`
      });
    }

    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || Object.keys(error.keyValue || {})[0] || "";
      const duplicateMessage =
        duplicateField === "email"
          ? "User already exists"
          : duplicateField === "admissionNo"
            ? "Admission number already exists"
            : "Duplicate record already exists";

      return res.status(409).json({
        success: false,
        message: duplicateMessage
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error"
    });
  }
};


// =========================
// GET STUDENTS
// =========================

const getStudents = async (req, res) => {

  try {

    const {
      class: studentClass,
      section,
      academicYear,
      lifecycleStatus,
      category,
      village,
      search,
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const requestedAcademicYearInput = normalizeAcademicSession(academicYear);
    let academicYearDoc = null;

    if (requestedAcademicYearInput) {
      academicYearDoc = await academicYearModel.findOne(resolveAcademicYearQuery(requestedAcademicYearInput));
    } else {
      // No academic year specified, use current
      academicYearDoc = await getCurrentAcademicYearDoc();
    }

    if (requestedAcademicYearInput && !academicYearDoc) {
      return res.status(400).json({
        success: false,
        message: `Academic year "${requestedAcademicYearInput}" does not exist`
      });
    }

    const resolvedAcademicYearLabel = academicYearDoc?.label || normalizeAcademicSession(academicYear) || (await getCurrentAcademicYear());

    const mergeStudent = (student, enrollment) => {
      const placement = resolveStudentPlacementSync(student, enrollment);
      const studentObject = student.toObject ? student.toObject() : student;

      return {
        ...studentObject,
        class: placement.className,
        section: placement.section,
        academicYear: placement.academicYear || resolvedAcademicYearLabel || studentObject.academicYear || "",
        currentEnrollment: enrollment || null
      };
    };

    const buildLegacyFilter = () => {
      const filter = {
        isDeleted: false
      };

      if (academicYearDoc?.label) {
        filter.academicYear = academicYearDoc.label;
      }

      if (lifecycleStatus) {
        filter.lifecycleStatus = lifecycleStatus;
      }

      if (category) {
        filter.category = category;
      }

      if (village) {
        filter["address.village"] = new RegExp(escapeRegex(String(village).trim()), "i");
      }

      if (search) {
        const searchRegex = new RegExp(escapeRegex(String(search).trim()), "i");
        const numericSearch = Number(search);
        filter.$or = [
          { admissionNo: searchRegex },
          ...(!Number.isNaN(numericSearch) ? [{ rollNo: numericSearch }] : []),
          { class: searchRegex },
          { section: searchRegex },
          { category: searchRegex },
          { fatherName: searchRegex },
          { motherName: searchRegex },
          { phone: searchRegex },
          { aadharNo: searchRegex },
          { samagraId: searchRegex },
          { apaarId: searchRegex },
          { panNo: searchRegex },
          { "address.village": searchRegex }
        ];
      }

      return filter;
    };

    let results = [];

    if (academicYearDoc) {
      const enrollmentFilter = {
        academicYear: academicYearDoc._id,
        status: "active"
      };

      const enrollments = await enrollmentModel
        .find(enrollmentFilter)
        .populate({
          path: "student",
          match: {
            isDeleted: false,
            ...(lifecycleStatus ? { lifecycleStatus } : {}),
            ...(category ? { category } : {}),
            ...(village ? { "address.village": new RegExp(escapeRegex(String(village).trim()), "i") } : {})
          },
          populate: {
            path: "userId",
            select: "name email"
          }
        })
        .populate("academicYear", "label isCurrent")
        .populate("promotedFrom");

      results = enrollments
        .filter((enrollment) => enrollment.student)
        .map((enrollment) => mergeStudent(enrollment.student, enrollment));
    } else {
      const legacyFilter = buildLegacyFilter();
      const legacyStudents = await studentModel
        .find(legacyFilter)
        .populate("userId", "name email");

      results = legacyStudents.map((student) => mergeStudent(student, null));
    }

    if (studentClass) {
      results = results.filter((student) => matchesNormalizedClass(student.class, studentClass));
    }

    if (section) {
      results = results.filter((student) => matchesNormalizedSection(student.section, section));
    }

    if (search) {
      const searchText = String(search).trim().toLowerCase();
      results = results.filter((student) => {
        const searchHit =
          student.userId?.name?.toLowerCase().includes(searchText) ||
          student.userId?.email?.toLowerCase().includes(searchText) ||
          student.admissionNo?.toLowerCase().includes(searchText) ||
          String(student.rollNo || "").includes(searchText) ||
          String(student.class || "").toLowerCase().includes(searchText) ||
          String(student.section || "").toLowerCase().includes(searchText) ||
          String(student.category || "").toLowerCase().includes(searchText) ||
          String(student.fatherName || "").toLowerCase().includes(searchText) ||
          String(student.motherName || "").toLowerCase().includes(searchText) ||
          String(student.phone || "").toLowerCase().includes(searchText) ||
          String(student.aadharNo || "").toLowerCase().includes(searchText) ||
          String(student.samagraId || "").toLowerCase().includes(searchText) ||
          String(student.apaarId || "").toLowerCase().includes(searchText) ||
          String(student.panNo || "").toLowerCase().includes(searchText) ||
          String(student.address?.village || "").toLowerCase().includes(searchText);

        return searchHit;
      });
    }

    const sortedResults = results.sort((a, b) => {
      const direction = order === "asc" ? 1 : -1;
      const aValue = a?.[sortBy];
      const bValue = b?.[sortBy];

      if (sortBy === "rollNo") {
        return (Number(aValue || 0) - Number(bValue || 0)) * direction;
      }

      return String(aValue || "").localeCompare(String(bValue || ""), undefined, {
        numeric: true,
        sensitivity: "base"
      }) * direction;
    });

    const totalStudents = sortedResults.length;
    const students = sortedResults.slice((page - 1) * limit, (page - 1) * limit + limit);

    return res.status(200).json({
      success: true,

      students,

      pagination: {
        page,
        limit,
        totalStudents,
        totalPages: Math.ceil(totalStudents / limit)
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


// =========================
// GET STUDENT BY ID
// =========================

const getStudentbyId = async (req, res) => {

  try {

    const { id } = req.params;

    const student = await studentModel.findById(id)
      .populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const currentAcademicYear = await getCurrentAcademicYear();
    const enrollment = await getEnrollmentPlacement(student._id, currentAcademicYear);
    const placement = resolveStudentPlacementSync(student, enrollment);

    return res.status(200).json({
      success: true,
      student: {
        ...student.toObject(),
        class: placement.className,
        section: placement.section,
        academicYear: placement.academicYear || currentAcademicYear || student.academicYear || "",
        currentEnrollment: enrollment || null
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

const getStudentFinancialHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await studentModel
      .findById(studentId)
      .populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const [payments, promotions] = await Promise.all([
      feePaymentModel
        .find({ studentId })
        .sort({ academicYear: -1, paymentDate: -1, createdAt: -1 }),
      promotionHistoryModel
        .find({ studentId })
        .select("oldAcademicYear newAcademicYear")
    ]);

    const academicYearSet = new Set();

    payments.forEach((payment) => {
      const academicYear = normalizeAcademicYear(payment.academicYear);
      if (academicYear) {
        academicYearSet.add(academicYear);
      }
    });

    promotions.forEach((promotion) => {
      const oldAcademicYear = normalizeAcademicYear(promotion.oldAcademicYear);
      const newAcademicYear = normalizeAcademicYear(promotion.newAcademicYear);

      if (oldAcademicYear) {
        academicYearSet.add(oldAcademicYear);
      }

      if (newAcademicYear) {
        academicYearSet.add(newAcademicYear);
      }
    });

    const currentAcademicYear = normalizeAcademicYear(student.academicYear);
    const currentEnrollmentYear = currentAcademicYear || normalizeAcademicYear(await getCurrentAcademicYear());
    if (currentEnrollmentYear) {
      academicYearSet.add(currentEnrollmentYear);
    }

    const academicYears = Array.from(academicYearSet).sort(
      (a, b) => academicYearSortValue(b) - academicYearSortValue(a)
    );

    const history = await Promise.all(
      academicYears.map(async (academicYear) => {
        const yearPayments = payments.filter(
          (payment) => normalizeAcademicYear(payment.academicYear) === academicYear
        );
        const snapshotPayment = yearPayments[0] || null;

        const activeEnrollment = await getEnrollmentPlacement(student._id, academicYear);
        const className = snapshotPayment?.className || activeEnrollment?.class || String(student.class || "").trim();
        const feeStructure = snapshotPayment?.feeStructureId
          ? await feeStructureModel.findOne({
              _id: snapshotPayment.feeStructureId,
              isDeleted: false
            })
          : await findMatchingFeeStructure(className, academicYear);

        const paidAmount = yearPayments.reduce(
          (sum, payment) => sum + Number(payment.paidAmount ?? payment.amount ?? 0),
          0
        );
        const feeStructureTotal = Number(feeStructure?.totalFee || 0);
        const fallbackTotal = yearPayments.reduce(
          (max, payment) =>
            Math.max(max, Number(payment.paidAmount ?? 0) + Number(payment.dueAmount ?? 0)),
          0
        );
        const totalFee = feeStructureTotal || fallbackTotal;
        const dueAmount = Math.max(0, totalFee - paidAmount);
        const status =
          dueAmount <= 0 && totalFee > 0
            ? "Paid"
            : paidAmount > 0
              ? "Partial"
              : "Pending";

        return {
          academicYear,
          className,
          totalFee,
          paidAmount,
          dueAmount,
          status,
          installments: buildMonthlyInstallments(yearPayments),
          payments: yearPayments.map((payment) => ({
            id: payment._id,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            amount: Number(payment.amount ?? payment.paidAmount ?? 0),
            paidAmount: Number(payment.paidAmount ?? payment.amount ?? 0),
            dueAmount: Number(payment.dueAmount ?? 0),
            paymentMethod: payment.paymentMethod || "Cash",
            month: payment.month || "",
            className: payment.className || className,
            admissionNo: payment.admissionNo || student.admissionNo || "",
            studentName: payment.studentName || student.userId?.name || ""
          })),
          receipts: yearPayments.map((payment) => ({
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            amount: Number(payment.amount ?? payment.paidAmount ?? 0),
            paymentMethod: payment.paymentMethod || "Cash",
            className: payment.className || className,
            academicYear: payment.academicYear || academicYear,
            admissionNo: payment.admissionNo || student.admissionNo || "",
            studentName: payment.studentName || student.userId?.name || ""
          }))
        };
      })
    );

    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.userId?.name || "",
        admissionNo: student.admissionNo || "",
        class: (await getEnrollmentPlacement(student._id, currentEnrollmentYear))?.class || student.class || "",
        academicYear: currentEnrollmentYear
      },
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


// =========================
// PROMOTION CONTEXT
// =========================

const getPromotionAcademicYears = async (_req, res) => {
  try {
    const academicYears = await academicYearModel
      .find()
      .sort({ isCurrent: -1, startDate: -1, createdAt: -1 })
      .select("label isCurrent");

    return res.status(200).json({
      success: true,
      academicYears: academicYears.map((year) => ({
        id: year._id,
        label: year.label,
        isCurrent: year.isCurrent
      })),
      academicYearDetails: academicYears
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getPromotionHistory = async (_req, res) => {
  try {
    const history = await promotionHistoryModel
      .find()
      .sort({ promotionDate: -1, createdAt: -1 })
      .populate({
        path: "studentId",
        select: "admissionNo class section academicYear lifecycleStatus userId",
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .populate("promotedBy", "name email");

    const formattedHistory = history.map((entry) => ({
      id: entry._id,
      promotionDate: entry.promotionDate,
      promotedBy: entry.promotedBy?.name || entry.promotedBy?.email || "",
      promotedById: entry.promotedBy?._id || "",
      studentId: entry.studentId?._id || "",
      studentName: entry.studentId?.userId?.name || "",
      admissionNo: entry.studentId?.admissionNo || "",
      oldClass: entry.oldClass,
      newClass: entry.newClass,
      oldSection: entry.oldSection || "",
      newSection: entry.newSection || "",
      oldAcademicYear: entry.oldAcademicYear,
      newAcademicYear: entry.newAcademicYear,
      reason: entry.reason || ""
    }));

    return res.status(200).json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const promoteStudents = async (req, res) => {
  try {
    const {
      currentAcademicYear,
      destinationAcademicYear,
      currentClass,
      currentSection,
      destinationClass,
      destinationSection,
      selectedStudentIds = [],
      promoteAllStudents = false,
      reason = ""
    } = req.body;

    const normalizedCurrentAcademicYear = normalizeAcademicSession(currentAcademicYear);
    const normalizedDestinationAcademicYear = normalizeAcademicSession(destinationAcademicYear);
    const normalizedCurrentClass = String(currentClass || "").trim();
    const normalizedCurrentSection = String(currentSection || "").trim();
    const normalizedDestinationClass = String(destinationClass || "").trim();
    const normalizedDestinationSection = String(destinationSection || "").trim();
    const normalizedPassedOutClass = normalizeClassLabel("Passed Out");
    const isPassedOutPromotion =
      normalizeClassLabel(normalizedDestinationClass) === normalizedPassedOutClass;

    if (
      !normalizedCurrentAcademicYear ||
      !normalizedDestinationAcademicYear ||
      !normalizedCurrentClass ||
      !normalizedDestinationClass
    ) {
      return res.status(400).json({
        success: false,
        message: "Current academic year, destination academic year, current class and destination class are required"
      });
    }

    if (
      normalizedCurrentClass.toLowerCase() ===
      normalizedDestinationClass.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: "Destination class must be different from the current class"
      });
    }

    if (normalizedCurrentAcademicYear === normalizedDestinationAcademicYear) {
      return res.status(400).json({
        success: false,
        message: "Destination academic year must be different from the current academic year"
      });
    }

    // Resolve source academic year (could be ObjectId or label string)
    let sourceAcademicYearDoc = await academicYearModel.findOne(
      resolveAcademicYearQuery(normalizedCurrentAcademicYear)
    );

    // Resolve destination academic year (could be ObjectId or label string)
    let destinationAcademicYearDoc = await academicYearModel.findOne(
      resolveAcademicYearQuery(normalizedDestinationAcademicYear)
    );

    if (!sourceAcademicYearDoc) {
      return res.status(400).json({
        success: false,
        message: "Current academic year does not exist"
      });
    }

    if (!destinationAcademicYearDoc) {
      return res.status(400).json({
        success: false,
        message: "Destination academic year does not exist"
      });
    }

    const idFilter = Array.isArray(selectedStudentIds)
      ? selectedStudentIds.filter(Boolean)
      : [];

    if (!promoteAllStudents && idFilter.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one student to promote"
      });
    }

    const sourceEnrollments = await enrollmentModel
      .find({
        academicYear: sourceAcademicYearDoc._id,
        class: normalizedCurrentClass,
        ...(normalizedCurrentSection ? { section: normalizedCurrentSection } : {}),
        status: "active"
      })
      .populate({
        path: "student",
        match: { isDeleted: false, lifecycleStatus: "Active" },
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .populate("academicYear", "label isCurrent");

    const enrollmentByStudentId = new Map(
      sourceEnrollments
        .filter((enrollment) => enrollment.student)
        .map((enrollment) => [String(enrollment.student._id), enrollment])
    );

    const candidateStudentIds = idFilter.length
      ? idFilter
      : Array.from(enrollmentByStudentId.keys());

    if (candidateStudentIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for the selected promotion criteria"
      });
    }

    const promotedStudents = [];
    const skippedStudents = [];
    const alreadyExistedStudents = [];
    const promotionSession = await mongoose.startSession();

    try {
      await promotionSession.withTransaction(async () => {
        for (const studentId of candidateStudentIds) {
          const enrollment = enrollmentByStudentId.get(String(studentId));
          if (!enrollment) {
            skippedStudents.push({
              studentId,
              name: "",
              reason: "No matching active enrollment found for the source academic year"
            });
            console.warn(
              `[promotion] skipped student ${studentId}: no active enrollment for ${normalizedCurrentAcademicYear} / ${normalizedCurrentClass}`
            );
            continue;
          }

          const student = enrollment.student;

          if (!student) {
            skippedStudents.push({
              studentId: enrollment.student?._id || enrollment.student,
              name: "",
              reason: "Student record not found for enrollment"
            });
            continue;
          }

          const destinationExisting = await enrollmentModel.findOne({
            student: student._id,
            academicYear: destinationAcademicYearDoc._id
          }).session(promotionSession);

          if (destinationExisting) {
            alreadyExistedStudents.push({
              studentId: student._id,
              name: student.userId?.name || "",
              reason: "Student already has an enrollment for the destination academic year"
            });
            continue;
          }

          const newEnrollment = await enrollmentModel.create([{
            student: student._id,
            academicYear: destinationAcademicYearDoc._id,
            class: normalizedDestinationClass,
            section: normalizedDestinationSection,
            rollNo: enrollment.rollNo ?? student.rollNo ?? null,
            status: "active",
            promotedFrom: enrollment._id
          }], { session: promotionSession });

          await promotionHistoryModel.create([{
            studentId: student._id,
            promotedBy: req.user.id,
            promotionDate: new Date(),
            oldClass: enrollment.class,
            newClass: normalizedDestinationClass,
            oldSection: enrollment.section || "",
            newSection: normalizedDestinationSection,
            oldAcademicYear: normalizedCurrentAcademicYear,
            newAcademicYear: normalizedDestinationAcademicYear,
            reason: String(reason || "").trim()
          }], { session: promotionSession });

          promotedStudents.push({
            id: newEnrollment[0]?._id || "",
            studentId: student._id,
            name: student.userId?.name || "",
            admissionNo: student.admissionNo || "",
            oldClass: enrollment.class,
            newClass: normalizedDestinationClass,
            oldAcademicYear: normalizedCurrentAcademicYear,
            newAcademicYear: normalizedDestinationAcademicYear,
            isPassedOut: isPassedOutPromotion
          });
        }
      });
    } finally {
      await promotionSession.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "Promotion completed successfully",
      summary: {
        promoted: promotedStudents.length,
        skipped: skippedStudents.length,
        alreadyExisted: alreadyExistedStudents.length,
        totalSelected: candidateStudentIds.length,
        promoteAllStudents: Boolean(promoteAllStudents)
      },
      promotedStudents,
      skippedStudents,
      alreadyExistedStudents
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


// =========================
// UPDATE
// =========================

const updatebyId = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      name,
      email,

      class: studentClass,
      section,
      rollNo,
      academicYear,
      lifecycleStatus,

      fatherName,
      motherName,
      phone,

      gender,
      dateOfBirth,
      joiningDate,

      category,

      aadharNo,
      samagraId,
      apaarId,
      panNo,
      bankDetails,
      address,
      usesTransport
    } = req.body;

    const student = await studentModel.findById(id);

    if (!student) {

      return res.status(404).json({
        success: false,
        message: "Student not found"
      });

    }

    await userModel.findByIdAndUpdate(student.userId, {
      name,
      email,
      
    });

    const normalizedAcademicYear = normalizeAcademicSession(academicYear) || student.academicYear || "";
    const normalizedSection = section === undefined || section === null
      ? String(student.section || "").trim()
      : String(section || "").trim();
    const normalizedClass = String(studentClass || "").trim();
    let feeStructure = null;

    if (student.class !== normalizedClass || normalizeAcademicSession(student.academicYear) !== normalizedAcademicYear) {
      feeStructure = await findMatchingFeeStructure(normalizedClass, normalizedAcademicYear);

    }

    let academicYearDoc = null;

    if (normalizedAcademicYear) {
      academicYearDoc = await academicYearModel.findOne(
        resolveAcademicYearQuery(normalizedAcademicYear)
      );
    }

    if (normalizedAcademicYear && !academicYearDoc) {
      academicYearDoc = await getCurrentAcademicYearDoc();
    }

    const updatePayload = {
      class: normalizedClass,
      section: normalizedSection,
      rollNo,

      fatherName,
      motherName,
      phone,

      gender,
      dateOfBirth,
      joiningDate,

      category,

      academicYear: normalizedAcademicYear || student.academicYear,

      aadharNo,
      samagraId,
      apaarId,
      panNo,
      bankDetails,
      address,

      usesTransport:
        usesTransport === true || usesTransport === "Yes",

      ...(lifecycleStatus
        ? { lifecycleStatus }
        : {}),

      ...(feeStructure && {
        feeStructureId: feeStructure._id,
        totalFee: feeStructure.totalFee,
        dueAmount: feeStructure.totalFee
      })
    };

    const session = await mongoose.startSession();

    let updatedStudent;

    try {
      await session.withTransaction(async () => {
        await userModel.findByIdAndUpdate(student.userId, {
          name,
          email
        }, { session });

        if (academicYearDoc) {
          const existingEnrollment = await enrollmentModel.findOne({
            student: student._id,
            academicYear: academicYearDoc._id
          }).session(session);

          const enrollmentPayload = {
            student: student._id,
            academicYear: academicYearDoc._id,
            class: normalizedClass || student.class,
            section: normalizedSection,
            rollNo: rollNo != null && rollNo !== "" ? Number(rollNo) : null,
            status: "active"
          };

          if (existingEnrollment) {
            await enrollmentModel.updateOne(
              { _id: existingEnrollment._id },
              { $set: enrollmentPayload },
              { session }
            );
          } else {
            await enrollmentModel.create([enrollmentPayload], { session });
          }
        }

        await studentModel.findByIdAndUpdate(
          id,
          updatePayload,
          {
            returnDocument: "after",
            session
          }
        );

        updatedStudent = await studentModel
          .findById(id)
          .populate("userId", "name email")
          .session(session);
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "Student Updated Successfully",
      student: updatedStudent
    });
  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }

};


// =========================
// DELETE (SOFT DELETE)
// =========================

const deletebyId = async (req, res) => {

  try {

    const { id } = req.params;

    const student = await studentModel.findById(id);

    if (!student) {

      return res.status(404).json({
        success: false,
        message: "Student not found"
      });

    }

    await studentModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date()
    });

    await userModel.findByIdAndUpdate(student.userId, {
      isDeleted: true,
      deletedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Student Deleted Successfully"
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
  addStudent,
  getStudents,
  getStudentbyId,
  getStudentFinancialHistory,
  getPromotionAcademicYears,
  getPromotionHistory,
  promoteStudents,
  updatebyId,
  deletebyId
};
