import enrollmentModel from "../models/enrollment.model.js";
import academicYearModel from "../models/academicYear.model.js";
import { resolveAcademicYearQuery } from "./mongoQueryHelpers.js";

const normalizeAcademicYear = (value) => String(value || "").trim();

const FALLBACK_ACADEMIC_YEAR = `${new Date().getFullYear()}-${String(
  new Date().getFullYear() + 1
).slice(-2)}`;

export const getCurrentAcademicYearDoc = async () => {
  const current = await academicYearModel.findOne({ isCurrent: true });
  if (current) {
    return current;
  }

  const latest = await academicYearModel.findOne().sort({ startDate: -1, createdAt: -1 });
  if (latest) {
    return latest;
  }

  const year = new Date().getFullYear();
  return academicYearModel.create({
    label: `${year}-${String(year + 1).slice(-2)}`,
    startDate: new Date(year, 6, 1),
    endDate: new Date(year + 1, 5, 30),
    isCurrent: true
  });
};

export const getAcademicYearLabel = (academicYearDoc) =>
  academicYearDoc?.label || FALLBACK_ACADEMIC_YEAR;

export const resolveStudentPlacement = async (student, academicYear = "") => {
  const studentId = student?._id || student?.id || null;
  const normalizedAcademicYear = normalizeAcademicYear(academicYear);

  if (!studentId) {
    return {
      className: String(student?.class || "").trim(),
      section: String(student?.section || "").trim(),
      academicYear: normalizedAcademicYear || normalizeAcademicYear(student?.academicYear),
      enrollment: null
    };
  }

  const academicYearDoc = normalizedAcademicYear
    ? await academicYearModel.findOne(resolveAcademicYearQuery(normalizedAcademicYear))
    : await getCurrentAcademicYearDoc();

  if (academicYearDoc) {
    const enrollment = await enrollmentModel
      .findOne({
        student: studentId,
        academicYear: academicYearDoc._id,
        status: "active"
      })
      .populate("academicYear", "label isCurrent");

    if (enrollment) {
      return {
        className: enrollment.class || "",
        section: enrollment.section || "",
        academicYear: enrollment.academicYear?.label || academicYearDoc.label,
        enrollment
      };
    }
  }

  return {
    className: String(student?.class || "").trim(),
    section: String(student?.section || "").trim(),
    academicYear: normalizedAcademicYear || normalizeAcademicYear(student?.academicYear),
    enrollment: null
  };
};

export const resolveStudentPlacementSync = (student, enrollment = null) => ({
  className: enrollment?.class || String(student?.class || "").trim(),
  section: enrollment?.section || String(student?.section || "").trim(),
  academicYear:
    enrollment?.academicYear?.label ||
    normalizeAcademicYear(student?.academicYear),
  enrollment
});
