import connectDB from "../src/config/db.js";
import studentModel from "../src/models/student.model.js";
import academicYearModel from "../src/models/academicYear.model.js";
import enrollmentModel from "../src/models/enrollment.model.js";

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
};

const buildDefaultAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${String(year + 1).slice(-2)}`;
};

const parseDate = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const main = async () => {
  await connectDB();

  const label = getArgValue("label") || process.env.ACADEMIC_YEAR_LABEL || buildDefaultAcademicYear();
  const startDate = parseDate(
    getArgValue("start") || process.env.ACADEMIC_YEAR_START,
    new Date(new Date().getFullYear(), 6, 1)
  );
  const endDate = parseDate(
    getArgValue("end") || process.env.ACADEMIC_YEAR_END,
    new Date(new Date().getFullYear() + 1, 5, 30)
  );

  let academicYear = await academicYearModel.findOne({ label });

  if (!academicYear) {
    academicYear = await academicYearModel.create({
      label,
      startDate,
      endDate,
      isCurrent: true
    });
    await academicYearModel.updateMany(
      { _id: { $ne: academicYear._id } },
      { $set: { isCurrent: false } }
    );
  } else if (!academicYear.isCurrent) {
    await academicYearModel.updateMany(
      { _id: { $ne: academicYear._id } },
      { $set: { isCurrent: false } }
    );
    academicYear.isCurrent = true;
    await academicYear.save();
  }

  const students = await studentModel.find({
    isDeleted: false
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const student of students) {
    const existingEnrollment = await enrollmentModel.findOne({
      student: student._id,
      academicYear: academicYear._id
    });

    if (existingEnrollment) {
      skippedCount += 1;
      continue;
    }

    await enrollmentModel.create({
      student: student._id,
      academicYear: academicYear._id,
      class: String(student.class || "").trim(),
      section: String(student.section || "").trim(),
      rollNo: student.rollNo ?? null,
      status: "active"
    });

    createdCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        academicYear: academicYear.label,
        createdCount,
        skippedCount
      },
      null,
      2
    )
  );

  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
