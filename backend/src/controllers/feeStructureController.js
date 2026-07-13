
import feeStructureModel from '../models/feeStructure.js'
import { normalizeAcademicYear } from "../utils/feeLifecycle.js";

const computeTotalFee = (payload) =>
  Number(payload.admissionFee || 0) +
  Number(payload.tuitionFee || 0) +
  Number(payload.computerFee || 0) +
  Number(payload.examFee || 0) +
  Number(payload.culturalActivityFee || 0);

const repairFeeStructureTotals = async (feeStructures = []) => {
  let repaired = 0;

  for (const structure of feeStructures) {
    const totalFee = computeTotalFee(structure);
    if (Number(structure.totalFee || 0) !== totalFee) {
      structure.totalFee = totalFee;
      await structure.save();
      repaired += 1;
    }
  }

  return repaired;
};

const createFeeStructure = async (req, res) => {
  try {

    const {
      class: studentClass,
      academicYear,
      academicSession,
      monthlyFee,
      admissionFee,
      tuitionFee,
      computerFee,
      examFee,
      culturalActivityFee,
      juneAmount,
      septemberAmount,
      decemberAmount,
      marchAmount
    } = req.body;

    const existingStructure =
      await feeStructureModel.findOne({
        class: studentClass,
        academicYear: normalizeAcademicYear(academicYear || academicSession)
      });

    if (existingStructure) {
      return res.status(409).json({
        success: false,
        message: "Fee Structure Already Exists"
      });
    }

    const feeStructure =
      await feeStructureModel.create({
        class: studentClass,
        academicYear: normalizeAcademicYear(academicYear || academicSession),
        academicSession: normalizeAcademicYear(academicSession || academicYear),
        monthlyFee,
        admissionFee,
        tuitionFee,
        computerFee,
        examFee,
        culturalActivityFee,
        totalFee: computeTotalFee({
          admissionFee,
          tuitionFee,
          computerFee,
          examFee,
          culturalActivityFee
        }),
        juneAmount,
        septemberAmount,
        decemberAmount,
        marchAmount
      });

    return res.status(201).json({
      success: true,
      message: "Fee Structure Created Successfully",
      feeStructure
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const getAllFeeStructures = async (req, res) => {
  try {

    const feeStructures =
      await feeStructureModel.find({isDeleted: false});

    await repairFeeStructureTotals(feeStructures);

    return res.status(200).json({
      success: true,
      feeStructures
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const getFeeStructureById = async (req, res) => {
  try {

    const { id } = req.params;

    const feeStructure =
      await feeStructureModel.findById(id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee Structure Not Found"
      });
    }

    if (feeStructure) {
      const totalFee = computeTotalFee(feeStructure);
      if (Number(feeStructure.totalFee || 0) !== totalFee) {
        feeStructure.totalFee = totalFee;
        await feeStructure.save();
      }
    }

    return res.status(200).json({
      success: true,
      feeStructure
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const updateFeeStructure = async (req, res) => {
  try {

    const { id } = req.params;

    const feeStructure =
      await feeStructureModel.findByIdAndUpdate(
        id,
        {
          ...req.body,
          academicYear: normalizeAcademicYear(req.body.academicYear || req.body.academicSession),
          academicSession: normalizeAcademicYear(req.body.academicSession || req.body.academicYear),
          totalFee: computeTotalFee(req.body)
        },
        {
          returnDocument: "after",
          runValidators: true
        }
      );

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee Structure Not Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee Structure Updated",
      feeStructure
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const deleteFeeStructure = async (req, res) => {
  try {

    const { id } = req.params;

    const feeStructure =
      await feeStructureModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date()
});

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee Structure Not Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee Structure Deleted Successfully"
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};
export default {
  createFeeStructure,
  getAllFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure
};
