
import feeStructureModel from '../models/feeStructure.js'

const createFeeStructure = async (req, res) => {
  try {

    const {
      class: studentClass,
      academicSession,
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
        academicSession
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
        academicSession,
        admissionFee,
        tuitionFee,
        computerFee,
        examFee,
        culturalActivityFee,
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
        req.body,
        {
          new: true,
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