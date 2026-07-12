import studentModel from "../models/student.model.js";
import userModel from "../models/userSchema.model.js";
import feeStructureModel from "../models/feeStructure.js";
import feePaymentModel from "../models/feePayment.model.js";
import promotionHistoryModel from "../models/promotionHistory.model.js";
import bcrypt from "bcryptjs";
import { normalizeAcademicYear, normalizeClassLabel, buildClassName, academicYearSortValue } from "../utils/feeLifecycle.js";

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

const academicSessionSortValue = (value) => {
  return academicYearSortValue(value);
};

const getAvailableAcademicSessions = async () => {
  const sessions = await feeStructureModel.distinct("academicSession", {
    isDeleted: false
  });
  const academicYears = await feeStructureModel.distinct("academicYear", {
    isDeleted: false
  });

  const uniqueSessions = Array.from(
    new Set(
      [...sessions, ...academicYears]
        .map(normalizeAcademicSession)
        .filter(Boolean)
    )
  );

  const currentYear = new Date().getFullYear();
  const fallbackSessions = [
    `${currentYear}-${String(currentYear + 1).slice(-2)}`,
    `${currentYear + 1}-${String(currentYear + 2).slice(-2)}`
  ];

  const combinedSessions = Array.from(
    new Set([...uniqueSessions, ...fallbackSessions])
  );

  return combinedSessions.sort(
    (a, b) => academicSessionSortValue(b) - academicSessionSortValue(a)
  );
};

const buildClassLabel = (studentClass) =>
  String(studentClass || "");

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

    // Email Exists
    const userExists = await userModel.findOne({ email });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
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
      normalizeAcademicSession(academicYear) || DEFAULT_ACADEMIC_SESSION;

    // Fee Structure

    const feeStructure = await findMatchingFeeStructure(studentClass, resolvedAcademicYear);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: `Fee Structure not found for class "${studentClass}" in academic year "${resolvedAcademicYear}"`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: "student"
    });

    const transportValue =
      usesTransport === true || usesTransport === "Yes";

    const student = await studentModel.create({
      userId: user._id,

      admissionNo,

      class: studentClass,
      rollNo,
      academicYear: resolvedAcademicYear,
      lifecycleStatus: lifecycleStatus || "Active",

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
      usesTransport: transportValue,
      address,

      feeStructureId: feeStructure._id,
      totalFee: feeStructure.totalFee,
      paidAmount: 0,
      dueAmount: feeStructure.totalFee,
      status: "Pending"
    });

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

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
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

    const filter = {
      isDeleted: false
    };

    if (studentClass)
      filter.class = studentClass;

    if (academicYear)
      filter.academicYear = academicYear;

    if (lifecycleStatus)
      filter.lifecycleStatus = lifecycleStatus;

    if (category)
      filter.category = category;

    if (village) {
      const villageRegex = new RegExp(
        escapeRegex(String(village).trim()),
        "i"
      );
      filter["address.village"] = villageRegex;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(String(search).trim()),
        "i"
      );

      const matchingUsers = await userModel.find(
        {
          isDeleted: false,
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        },
        "_id"
      );

      const matchingUserIds = matchingUsers.map((user) => user._id);
      const numericSearch = Number(search);

      filter.$or = [
        ...(matchingUserIds.length
          ? [{ userId: { $in: matchingUserIds } }]
          : []),
        { admissionNo: searchRegex },
        ...(!Number.isNaN(numericSearch)
          ? [{ rollNo: numericSearch }]
          : []),
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

    const totalStudents = await studentModel.countDocuments(filter);

    const students = await studentModel.find(filter)
      .populate("userId", "name email")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1
      })
      .skip((page - 1) * limit)
      .limit(limit);

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

    return res.status(200).json({
      success: true,
      student
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
    if (currentAcademicYear) {
      academicYearSet.add(currentAcademicYear);
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

        const className = snapshotPayment?.className || String(student.class || "").trim();
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
        class: student.class || "",
        academicYear: currentAcademicYear
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
    const academicYears = await getAvailableAcademicSessions();

    return res.status(200).json({
      success: true,
      academicYears
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

    const availableAcademicYears = await getAvailableAcademicSessions();

    if (!availableAcademicYears.includes(normalizedCurrentAcademicYear)) {
      return res.status(400).json({
        success: false,
        message: "Current academic year does not exist"
      });
    }

    if (!availableAcademicYears.includes(normalizedDestinationAcademicYear)) {
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

    const rosterFilter = {
      isDeleted: false,
      class: normalizedCurrentClass,
      academicYear: normalizedCurrentAcademicYear
    };

    let students = [];

    if (idFilter.length > 0) {
      students = await studentModel
        .find({
          _id: { $in: idFilter },
          isDeleted: false
        })
        .populate("userId", "name email");
    } else {
      students = await studentModel
        .find(rosterFilter)
        .populate("userId", "name email");
    }

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for the selected promotion criteria"
      });
    }

    const activeStatuses = new Set(["Active"]);
    const promotedStudents = [];
    const skippedStudents = [];
    const alreadyExistedStudents = [];

    for (const student of students) {
      const studentAcademicYear = normalizeAcademicSession(
        student.academicYear || normalizedCurrentAcademicYear
      );

      if (
        normalizedCurrentClass &&
        String(student.class || "").trim().toLowerCase() !== normalizedCurrentClass.toLowerCase()
      ) {
        skippedStudents.push({
          studentId: student._id,
          name: student.userId?.name || "",
          reason: "Student is not in the selected current class"
        });
        continue;
      }

      if (studentAcademicYear !== normalizedCurrentAcademicYear) {
        skippedStudents.push({
          studentId: student._id,
          name: student.userId?.name || "",
          reason: "Student is not in the selected current academic year"
        });
        continue;
      }

      if (!activeStatuses.has(String(student.lifecycleStatus || "Active"))) {
        skippedStudents.push({
          studentId: student._id,
          name: student.userId?.name || "",
          reason: `Student status is ${student.lifecycleStatus || "Inactive"}`
        });
        continue;
      }

      const destinationFeeStructure = await findMatchingFeeStructure(
        normalizedDestinationClass,
        normalizedDestinationAcademicYear
      );

      if (
        String(student.class || "").trim().toLowerCase() === normalizedDestinationClass.toLowerCase()
      ) {
        alreadyExistedStudents.push({
          studentId: student._id,
          name: student.userId?.name || "",
          reason: "Student already belongs to the destination class"
        });
        continue;
      }

      const updatedStudent = await studentModel.findByIdAndUpdate(
        student._id,
        {
          class: normalizedDestinationClass,
          academicYear: normalizedDestinationAcademicYear,
          ...(destinationFeeStructure
            ? {
                feeStructureId: destinationFeeStructure._id,
                totalFee: destinationFeeStructure.totalFee,
                paidAmount: 0,
                dueAmount: destinationFeeStructure.totalFee,
                status: "Pending"
              }
            : {})
        },
        {
          returnDocument: "after"
        }
      );

      await promotionHistoryModel.create({
        studentId: student._id,
        promotedBy: req.user.id,
        promotionDate: new Date(),
        oldClass: student.class,
        newClass: normalizedDestinationClass,
        oldAcademicYear: studentAcademicYear,
        newAcademicYear: normalizedDestinationAcademicYear,
        reason: String(reason || "").trim()
      });

      promotedStudents.push({
        id: updatedStudent?._id || student._id,
        studentId: student._id,
        name: student.userId?.name || "",
        admissionNo: student.admissionNo || "",
        oldClass: student.class,
        newClass: normalizedDestinationClass,
        oldAcademicYear: studentAcademicYear,
        newAcademicYear: normalizedDestinationAcademicYear
      });
    }

    return res.status(200).json({
      success: true,
      message: "Promotion completed successfully",
      summary: {
        promoted: promotedStudents.length,
        skipped: skippedStudents.length,
        alreadyExisted: alreadyExistedStudents.length,
        totalSelected: students.length,
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

    let feeStructure = null;

    if (student.class !== studentClass || student.academicYear !== academicYear) {
      feeStructure = await findMatchingFeeStructure(studentClass, academicYear);

    }

    const updatePayload = {
      class: studentClass,
      rollNo,

      fatherName,
      motherName,
      phone,

      gender,
      dateOfBirth,
      joiningDate,

      category,

      academicYear: normalizeAcademicSession(academicYear) || student.academicYear,

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

    const updatedStudent = await studentModel.findByIdAndUpdate(
      id,
      updatePayload,
      {
        returnDocument: "after"
      }
    ).populate("userId", "name email");

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
