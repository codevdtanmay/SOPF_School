import tcModel from "../models/tc.model.js";
import studentModel from "../models/student.model.js";
import { resolveStudentPlacement } from "../utils/studentPlacement.js";

const generateTC = async (req, res) => {
  try {
    const {
      studentId,
      reason,
      conduct,
      lastAttendanceDate,
      promotedTo,
      remarks,
      issuedBy
    } = req.body;

    // Find Student
    const student = await studentModel.findById(studentId).populate(
      "userId",
      "name email"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if TC already issued
    const existingTC = await tcModel.findOne({
      studentId,
      status: "Issued"
    });

    if (existingTC) {
      return res.status(400).json({
        success: false,
        message: "Transfer Certificate already issued."
      });
    }

    // Generate TC Number
    const totalTCs = await tcModel.countDocuments();

    const year = new Date().getFullYear();

    const tcNumber = `TC-${year}-${String(totalTCs + 1).padStart(4, "0")}`;

    // Today's date
    const issueDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const tc = await tcModel.create({
      studentId,

      tcNumber,

      issueDate,

      reason,

      conduct,

      lastAttendanceDate,

      admissionDate: student.joiningDate,

      classLeaving: (await resolveStudentPlacement(student, student.academicYear)).className,

      promotedTo,

      remarks,

      issuedBy
    });

    return res.status(201).json({
      success: true,
      message: "Transfer Certificate generated successfully.",
      tc
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
const getAllTCs = async (req, res) => {
  try {
    const { search } = req.query;

    let tcs = await tcModel
      .find()
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .sort({ createdAt: -1 });

    // Search by student name or TC Number
    if (search) {
      const keyword = search.toLowerCase();

      tcs = tcs.filter(tc =>
        tc.tcNumber.toLowerCase().includes(keyword) ||
        tc.studentId?.userId?.name?.toLowerCase().includes(keyword)
      );
    }

    const formattedTCs = await Promise.all(
      tcs.map(async (tc) => {
        const placement = await resolveStudentPlacement(tc.studentId, tc.studentId?.academicYear);

        return {
          id: tc._id,
          tcNumber: tc.tcNumber,
          issueDate: tc.issueDate,
          studentId: tc.studentId?._id,
          studentName: tc.studentId?.userId?.name || "",
          admissionNo: tc.studentId?.admissionNo || "",
          classLeaving: tc.classLeaving || placement.className || "",
          section: placement.section || "",
          fatherName: tc.studentId?.fatherName || "",
          motherName: tc.studentId?.motherName || "",
          joiningDate: tc.studentId?.joiningDate || "",
          category: tc.studentId?.category || "",
          reason: tc.reason || "",
          conduct: tc.conduct || "",
          lastAttendanceDate: tc.lastAttendanceDate || "",
          promotedTo: tc.promotedTo || "",
          remarks: tc.remarks || "",
          issuedBy: tc.issuedBy || "",
          status: tc.status
        };
      })
    );

    return res.status(200).json({
      success: true,
      totalTCs: formattedTCs.length,
      tcs: formattedTCs
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getTCById = async (req, res) => {
  try {
    const { id } = req.params;

    const tc = await tcModel
      .findById(id)
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      });

    if (!tc) {
      return res.status(404).json({
        success: false,
        message: "Transfer Certificate not found"
      });
    }

    const placement = await resolveStudentPlacement(tc.studentId, tc.studentId?.academicYear);

    const formattedTC = {
      id: tc._id,

      tcNumber: tc.tcNumber,

      issueDate: tc.issueDate,

      student: {
        id: tc.studentId._id,
        name: tc.studentId.userId.name,
        email: tc.studentId.userId.email,

        admissionNo: tc.studentId.admissionNo,

        class: placement.className,
        section: placement.section,

        fatherName: tc.studentId.fatherName,

        motherName: tc.studentId.motherName,

        joiningDate: tc.studentId.joiningDate,

        category: tc.studentId.category
      },

      reason: tc.reason,

      conduct: tc.conduct,

      lastAttendanceDate: tc.lastAttendanceDate,

      promotedTo: tc.promotedTo,

      remarks: tc.remarks,

      issuedBy: tc.issuedBy,

      status: tc.status
    };

    return res.status(200).json({
      success: true,
      tc: formattedTC
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
const cancelTC = async (req, res) => {
  try {
    const { id } = req.params;

    const tc = await tcModel.findById(id);

    if (!tc) {
      return res.status(404).json({
        success: false,
        message: "Transfer Certificate not found"
      });
    }

    if (tc.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Transfer Certificate is already cancelled."
      });
    }

    tc.status = "Cancelled";

    await tc.save();

    return res.status(200).json({
      success: true,
      message: "Transfer Certificate cancelled successfully."
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
    generateTC,
    getAllTCs,
    getTCById,
    cancelTC
};
