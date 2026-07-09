import studentModel from "../models/student.model.js";
import userModel from "../models/userSchema.model.js";
import feeStructureModel from "../models/feeStructure.js";
import bcrypt from "bcryptjs";


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
      section,
      rollNo,

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

    // Fee Structure

    const feeStructure = await feeStructureModel.findOne({
      class: studentClass
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee Structure not found"
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
      section,
      rollNo,

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
      dueAmount: feeStructure.totalFee
    });

    return res.status(201).json({
      success: true,
      message: "Student Added Successfully",
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


// =========================
// GET STUDENTS
// =========================

const getStudents = async (req, res) => {

  try {

    const {
      class: studentClass,
      category,
      village,
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

    if (category)
      filter.category = category;

    if (village)
      filter["address.village"] = village;

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

    if (student.class !== studentClass) {

      feeStructure = await feeStructureModel.findOne({
        class: studentClass
      });

    }

    const updatedStudent = await studentModel.findByIdAndUpdate(
  id,
  {
    class: studentClass,
    section,
    rollNo,

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

    usesTransport:
      usesTransport === true || usesTransport === "Yes",

    ...(feeStructure && {
      feeStructureId: feeStructure._id,
      totalFee: feeStructure.totalFee,
      dueAmount: feeStructure.totalFee
    })
  },
  {
    new: true
  }
);

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
  updatebyId,
  deletebyId
};