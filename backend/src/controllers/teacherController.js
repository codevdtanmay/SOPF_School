import teacherModel from "../models/teacherSchema.model.js";
import userModel from "../models/userSchema.model.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// create teacher API

const createTeacher = async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      employeeId,
      department,
      qualification,
      phone
    } = req.body;

    const isUserExist = await userModel.findOne({ email });

    if (isUserExist) {
      return res.status(409).json({
        success: false,
        message: "Teacher already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const session = await mongoose.startSession();
    let teacher;

    try {
      await session.withTransaction(async () => {
        const user = await userModel.create([{
          name,
          email,
          password: hashedPassword,
          role: "teacher"
        }], { session });

        const createdTeacher = await teacherModel.create([{
          userId: user[0]._id,
          employeeId,
          department,
          qualification,
          phone
        }], { session });

        teacher = createdTeacher[0];
      });
    } finally {
      await session.endSession();
    }

    const populatedTeacher = await teacherModel
      .findById(teacher._id)
      .populate("userId", "name email");

    return res.status(201).json({
      success: true,
      message: "Teacher Added Successfully",
      teacher: populatedTeacher
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

// GEt all teachers

const getAllTeachers = async (req, res) => {
  try {

    const teachers = await teacherModel
      .find({isDeleted: false})
      .populate("userId", "name email");

    return res.status(200).json({
      success: true,
      teachers
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

// Get Teacher By ID

const getTeacherById = async (req, res) => {
  try {

    const { id } = req.params;

    const teacher = await teacherModel
      .findById(id)
      .populate("userId", "name email");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    return res.status(200).json({
      success: true,
      teacher
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

//  Update Teacher

const updateTeacher = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      name,
      email,
      department,
      qualification,
      phone
    } = req.body;

    const teacher = await teacherModel.findById(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const session = await mongoose.startSession();
    let updatedTeacher;

    try {
      await session.withTransaction(async () => {
        await userModel.findByIdAndUpdate(
          teacher.userId,
          {
            name,
            email
          },
          { session }
        );

        updatedTeacher = await teacherModel.findByIdAndUpdate(
          id,
          {
            department,
            qualification,
            phone
          },
          {
            returnDocument: "after",
            session
          }
        ).populate("userId", "name email");
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "Teacher Updated Successfully",
      teacher: updatedTeacher
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

// Delete Teacher

const deleteTeacher = async (req, res) => {
  try {

    const { id } = req.params;

    const teacher = await teacherModel.findById(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    await teacherModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date()
});

    await userModel.findByIdAndUpdate(teacher.userId, {
      isDeleted: true,
      deletedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Teacher Deleted Successfully"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

// Export Controller

export default {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};
