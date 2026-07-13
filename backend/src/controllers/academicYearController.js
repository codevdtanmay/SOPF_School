import academicYearModel from "../models/academicYear.model.js";
import feeStructureModel from "../models/feeStructure.js";
import { normalizeAcademicYear } from "../utils/feeLifecycle.js";
import mongoose from "mongoose";

const computeTotalFee = (structure) =>
  Number(structure.admissionFee || 0) +
  Number(structure.tuitionFee || 0) +
  Number(structure.computerFee || 0) +
  Number(structure.examFee || 0) +
  Number(structure.culturalActivityFee || 0);

const repairFeeStructureTotalsForAcademicYear = async (academicYear, session = null) => {
  const structures = await feeStructureModel.find({
    academicYear,
    isDeleted: false
  }).session(session);

  if (!structures.length) {
    return 0;
  }

  let repaired = 0;
  for (const structure of structures) {
    const totalFee = computeTotalFee(structure);
    if (Number(structure.totalFee || 0) !== totalFee) {
      structure.totalFee = totalFee;
      await structure.save({ session });
      repaired += 1;
    }
  }

  return repaired;
};

const cloneFeeStructuresForAcademicYear = async (sourceAcademicYear, targetAcademicYear, session = null) => {
  const sourceStructures = await feeStructureModel
    .find({ academicYear: sourceAcademicYear, isDeleted: false })
    .sort({ class: 1, section: 1, createdAt: 1 })
    .session(session);

  if (!sourceStructures.length) {
    return { cloned: 0, skipped: 0 };
  }

  const existingTargetStructures = await feeStructureModel
    .find({ academicYear: targetAcademicYear, isDeleted: false })
    .select("class section")
    .session(session);

  const existingKeys = new Set(
    existingTargetStructures.map((structure) =>
      `${String(structure.class || "").trim().toLowerCase()}::${String(structure.section || "").trim().toLowerCase()}`
    )
  );

  const structuresToCreate = sourceStructures
    .map((structure) => {
      const key = `${String(structure.class || "").trim().toLowerCase()}::${String(structure.section || "").trim().toLowerCase()}`;
      if (existingKeys.has(key)) {
        return null;
      }

      const source = structure.toObject();
      const {
        _id,
        id,
        createdAt,
        updatedAt,
        academicYear: _academicYear,
        academicSession: _academicSession,
        isDeleted,
        deletedAt,
        ...rest
      } = source;

      return {
        ...rest,
        totalFee: computeTotalFee(rest),
        academicYear: targetAcademicYear,
        academicSession: targetAcademicYear,
        isDeleted: false,
        deletedAt: null
      };
    })
    .filter(Boolean);

  if (!structuresToCreate.length) {
    return { cloned: 0, skipped: sourceStructures.length };
  }

  await feeStructureModel.insertMany(structuresToCreate, { ordered: false, session });

  return {
    cloned: structuresToCreate.length,
    skipped: sourceStructures.length - structuresToCreate.length
  };
};

const getAcademicYears = async (_req, res) => {
  try {
    const academicYears = await academicYearModel
      .find()
      .sort({ isCurrent: -1, startDate: -1, createdAt: -1 });

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

const setCurrentAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await mongoose.startSession();
    let targetAcademicYear;
    let repairedCount = 0;

    try {
      await session.withTransaction(async () => {
        targetAcademicYear = await academicYearModel.findById(id).session(session);
        if (!targetAcademicYear) {
          return;
        }

        await academicYearModel.updateMany(
          { _id: { $ne: targetAcademicYear._id } },
          { $set: { isCurrent: false } },
          { session }
        );

        targetAcademicYear.isCurrent = true;
        await targetAcademicYear.save({ session });

        repairedCount = await repairFeeStructureTotalsForAcademicYear(targetAcademicYear.label, session);
      });
    } finally {
      await session.endSession();
    }

    if (!targetAcademicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Academic year "${targetAcademicYear.label}" set as current`,
      academicYear: targetAcademicYear,
      feeStructuresRepaired: repairedCount
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const addNextSession = async (_req, res) => {
  try {
    const session = await mongoose.startSession();
    let nextAcademicYear;
    let clonedStats = { cloned: 0, skipped: 0 };
    let repairedCount = 0;
    let createdNewAcademicYear = false;
    let validationError = "";
    let notFound = false;

    try {
      await session.withTransaction(async () => {
        const latestAcademicYear = await academicYearModel
          .findOne()
          .sort({ startDate: -1, createdAt: -1, label: -1 })
          .session(session);

        if (!latestAcademicYear) {
          notFound = true;
          return;
        }

        const labelMatch = normalizeAcademicYear(latestAcademicYear.label).match(/^(\d{4})-(\d{2}|\d{4})$/);

        if (!labelMatch) {
          validationError = "Latest academic year label is not in a supported format";
          return;
        }

        const startYear = Number(labelMatch[1]);
        const endYear = Number(labelMatch[2].length === 2 ? String(startYear + 1) : labelMatch[2]);
        const nextStartYear = startYear + 1;
        const nextEndYear = endYear + 1;
        const nextLabel = `${nextStartYear}-${String(nextEndYear).slice(-2)}`;

        const existing = await academicYearModel.findOne({ label: nextLabel }).session(session);
        if (existing) {
          nextAcademicYear = existing;
          clonedStats = await cloneFeeStructuresForAcademicYear(latestAcademicYear.label, nextLabel, session);
          repairedCount = await repairFeeStructureTotalsForAcademicYear(nextLabel, session);
          return;
        }

        nextAcademicYear = await academicYearModel
          .create([{
            label: nextLabel,
            startDate: new Date(nextStartYear, 6, 1),
            endDate: new Date(nextEndYear, 5, 30),
            isCurrent: false
          }], { session })
          .then((docs) => docs[0]);
        createdNewAcademicYear = true;

        clonedStats = await cloneFeeStructuresForAcademicYear(latestAcademicYear.label, nextLabel, session);
        repairedCount = await repairFeeStructureTotalsForAcademicYear(nextLabel, session);
    });
    } finally {
      await session.endSession();
    }

    if (notFound) {
      return res.status(404).json({
        success: false,
        message: "No academic year found to extend"
      });
    }

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    if (!nextAcademicYear) {
      return res.status(500).json({
        success: false,
        message: "Unable to create the next academic year"
      });
    }

    const statusCode = createdNewAcademicYear ? 201 : 200;

    return res.status(statusCode).json({
      success: true,
      message: statusCode === 200 ? "Next academic year already exists" : "Next academic year created successfully",
      academicYear: nextAcademicYear,
      feeStructuresCloned: clonedStats.cloned,
      feeStructuresSkipped: clonedStats.skipped,
      feeStructuresRepaired: repairedCount
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
  getAcademicYears,
  setCurrentAcademicYear,
  addNextSession
};
