import enrollmentModel from "../models/enrollment.model.js";
import { normalizeAcademicYear } from "./feeLifecycle.js";

export const resolveAdmissionTypeForAcademicYear = async (
  studentId,
  academicYear,
  fallbackAdmissionType = "new"
) => {
  const targetAcademicYear = normalizeAcademicYear(academicYear);

  if (!studentId || !targetAcademicYear) {
    return String(fallbackAdmissionType || "new");
  }

  const enrollments = await enrollmentModel
    .find({ student: studentId })
    .sort({ createdAt: 1 })
    .populate("academicYear", "label");

  if (!Array.isArray(enrollments) || enrollments.length === 0) {
    return String(fallbackAdmissionType || "new");
  }

  const firstEnrollmentYear = normalizeAcademicYear(
    enrollments[0]?.academicYear?.label || enrollments[0]?.academicYear || ""
  );

  if (!firstEnrollmentYear) {
    return String(fallbackAdmissionType || "new");
  }

  return targetAcademicYear === firstEnrollmentYear ? "new" : "old";
};

export default resolveAdmissionTypeForAcademicYear;
