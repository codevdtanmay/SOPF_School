import academicYearModel from "../models/academicYear.model.js";
import feeStructureModel from "../models/feeStructure.js";
import { normalizeAcademicYear } from "../utils/feeLifecycle.js";

const computeTotalFee = (structure) =>
  Number(structure.admissionFee || 0) +
  Number(structure.tuitionFee || 0) +
  Number(structure.computerFee || 0) +
  Number(structure.examFee || 0) +
  Number(structure.culturalActivityFee || 0);

const repairFeeStructureTotalsForAcademicYear = async (academicYear) => {
  const structures = await feeStructureModel.find({
    academicYear,
    isDeleted: false
  });

  if (!structures.length) {
    return 0;
  }

  let repaired = 0;
  for (const structure of structures) {
    const totalFee = computeTotalFee(structure);
    if (Number(structure.totalFee || 0) !== totalFee) {
      structure.totalFee = totalFee;
      await structure.save();
      repaired += 1;
    }
  }

  return repaired;
};

const cloneFeeStructuresForAcademicYear = async (sourceAcademicYear, targetAcademicYear) => {
  const sourceStructures = await feeStructureModel
    .find({ academicYear: sourceAcademicYear, isDeleted: false })
    .sort({ class: 1, section: 1, createdAt: 1 });

  if (!sourceStructures.length) {
    return { cloned: 0, skipped: 0 };
  }

  const existingTargetStructures = await feeStructureModel
    .find({ academicYear: targetAcademicYear, isDeleted: false })
    .select("class section");

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

  await feeStructureModel.insertMany(structuresToCreate, { ordered: false });

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

    const targetAcademicYear = await academicYearModel.findById(id);
    if (!targetAcademicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found"
      });
    }

    await academicYearModel.updateMany(
      { _id: { $ne: targetAcademicYear._id } },
      { $set: { isCurrent: false } }
    );

    targetAcademicYear.isCurrent = true;
    await targetAcademicYear.save();

    const repairedCount = await repairFeeStructureTotalsForAcademicYear(targetAcademicYear.label);

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
    const latestAcademicYear = await academicYearModel
      .findOne()
      .sort({ startDate: -1, createdAt: -1, label: -1 });

    if (!latestAcademicYear) {
      return res.status(404).json({
        success: false,
        message: "No academic year found to extend"
      });
    }

    const labelMatch = normalizeAcademicYear(latestAcademicYear.label).match(/^(\d{4})-(\d{2}|\d{4})$/);

    if (!labelMatch) {
      return res.status(400).json({
        success: false,
        message: "Latest academic year label is not in a supported format"
      });
    }

    const startYear = Number(labelMatch[1]);
    const endYear = Number(labelMatch[2].length === 2 ? String(startYear + 1) : labelMatch[2]);
    const nextStartYear = startYear + 1;
    const nextEndYear = endYear + 1;
    const nextLabel = `${nextStartYear}-${String(nextEndYear).slice(-2)}`;

    const existing = await academicYearModel.findOne({ label: nextLabel });
    if (existing) {
      const clonedStats = await cloneFeeStructuresForAcademicYear(latestAcademicYear.label, nextLabel);
      const repairedCount = await repairFeeStructureTotalsForAcademicYear(nextLabel);
      return res.status(200).json({
        success: true,
        message: "Next academic year already exists",
        academicYear: existing,
        feeStructuresCloned: clonedStats.cloned,
        feeStructuresSkipped: clonedStats.skipped,
        feeStructuresRepaired: repairedCount
      });
    }

    const nextAcademicYear = await academicYearModel.create({
      label: nextLabel,
      startDate: new Date(nextStartYear, 6, 1),
      endDate: new Date(nextEndYear, 5, 30),
      isCurrent: false
    });

    const clonedStats = await cloneFeeStructuresForAcademicYear(latestAcademicYear.label, nextLabel);
    const repairedCount = await repairFeeStructureTotalsForAcademicYear(nextLabel);

    return res.status(201).json({
      success: true,
      message: "Next academic year created successfully",
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
