import { resolveStudentPlacementSync } from "./studentPlacement.js";

export const normalizeAcademicYear = (value) =>
  String(value || "").trim();

export const normalizeClassLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^class\s+/, "");

  if (!normalized) {
    return "";
  }

  if (["nursery", "lkg", "ukg"].includes(normalized)) {
    return normalized;
  }

  const numericMatch = normalized.match(/^(\d{1,2})(st|nd|rd|th)?$/);

  if (numericMatch) {
    return numericMatch[1];
  }

  return normalized.replace(/\s+/g, " ");
};

export const normalizeSectionLabel = (value) =>
  String(value || "").trim().toUpperCase();

export const buildClassName = (studentClass, section) => {
  const className = String(studentClass || "").trim();
  const normalizedSection = normalizeSectionLabel(section);

  if (!className) {
    return "";
  }

  return normalizedSection ? `${className}-${normalizedSection}` : className;
};

export const academicYearSortValue = (value) => {
  const match = normalizeAcademicYear(value).match(/^(\d{4})-(\d{2}|\d{4})$/);

  if (match) {
    return Number(match[1]);
  }

  const yearMatch = normalizeAcademicYear(value).match(/(\d{4})/);
  return yearMatch ? Number(yearMatch[1]) : 0;
};

export const currentMonthLabel = (date = new Date()) =>
  date.toLocaleString("en-US", { month: "long" });

export const buildFeePaymentSnapshot = ({
  student,
  feeStructure,
  amountPaid,
  paymentMethod,
  receiptNo,
  paymentDate = new Date(),
  month = currentMonthLabel(paymentDate),
  paidAmount = amountPaid,
  dueAmount = 0,
  status = "Pending"
}) => {
  const placement = resolveStudentPlacementSync(student, student?.currentEnrollment || student?.enrollment || null);

  return {
    studentId: student._id,
    studentName: student.userId?.name || "",
    admissionNo: student.admissionNo || "",
    className: placement.className,
    section: placement.section,
    academicYear: placement.academicYear || normalizeAcademicYear(student.academicYear),
    feeStructureId: feeStructure?._id || null,
    month,
    amount: Number(amountPaid) || 0,
    paidAmount: Number(paidAmount) || 0,
    dueAmount: Number(dueAmount) || 0,
    status,
    paymentMethod: paymentMethod || "Cash",
    receiptNo,
    paymentDate
  };
};

export const buildTransportPaymentSnapshot = ({
  student,
  transport,
  month,
  year,
  receiptNo,
  amount,
  paidAmount,
  dueAmount,
  status,
  paymentMethod,
  paymentDate = new Date(),
  remarks = ""
}) => {
  const placement = resolveStudentPlacementSync(student, student?.currentEnrollment || student?.enrollment || null);

  return {
    studentId: student._id,
    studentName: student.userId?.name || "",
    admissionNo: student.admissionNo || "",
    className: placement.className,
    section: placement.section,
    academicYear: placement.academicYear || normalizeAcademicYear(student.academicYear),
    transportId: transport?._id || null,
    routeName: transport?.routeName || "",
    pickupPoint: transport?.pickupPoint || "",
    monthlyCharge: Number(transport?.monthlyCharge || 0),
    month: Number(month),
    year: Number(year),
    receiptNo,
    amount: Number(amount) || 0,
    paidAmount: Number(paidAmount) || 0,
    dueAmount: Number(dueAmount) || 0,
    status,
    paymentMethod: paymentMethod || "Cash",
    paymentDate,
    remarks
  };
};
