import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";

const addTransport = async (req, res) => {
  try {
    const {
      studentId,
      routeName,
      pickupPoint,
      monthlyCharge,
      joiningDate
    } = req.body;

    const student = await studentModel.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const existing = await transportModel.findOne({ studentId });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Transport already assigned"
      });
    }

    const transport = await transportModel.create({
      studentId,
      routeName,
      pickupPoint,
      monthlyCharge,
      joiningDate
    });

    return res.status(201).json({
      success: true,
      message: "Transport assigned successfully",
      transport
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const getAllTransportStudents = async (req, res) => {
  try {

    const transports = await transportModel
      .find()
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      });

    const formattedTransports = transports.map((transport) => ({
      id: transport._id,

      studentId: transport.studentId?._id,

      name: transport.studentId?.userId?.name,

      email: transport.studentId?.userId?.email,

      admissionNo: transport.studentId?.admissionNo,

      className: `${transport.studentId?.class}-${transport.studentId?.section}`,

      routeName: transport.routeName,

      pickupPoint: transport.pickupPoint,

      monthlyCharge: transport.monthlyCharge,

      joiningDate: transport.joiningDate,

      status: transport.status
    }));

    return res.status(200).json({
      success: true,
      transports: formattedTransports
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const getTransportById = async (req, res) => {
  try {

    const { id } = req.params;

    const transport = await transportModel.findById(id)
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      });

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport record not found"
      });
    }

    return res.status(200).json({
      success: true,
      transport
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

const updateTransport = async (req, res) => {
  try {

    const { id } = req.params;

    const transport = await transportModel.findById(id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport record not found"
      });
    }

    const updated = await transportModel
  .findByIdAndUpdate(id, req.body, { new: true })
  .populate({
    path: "studentId",
    populate: {
      path: "userId",
      select: "name email"
    }
  });

return res.status(200).json({
  success: true,
  transport: {
    id: updated._id,
    studentId: updated.studentId?._id,
    name: updated.studentId?.userId?.name,
    email: updated.studentId?.userId?.email,
    admissionNo: updated.studentId?.admissionNo,
    className: `${updated.studentId?.class}-${updated.studentId?.section}`,
    routeName: updated.routeName,
    pickupPoint: updated.pickupPoint,
    monthlyCharge: updated.monthlyCharge,
    joiningDate: updated.joiningDate,
    status: updated.status
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

const deleteTransport = async (req, res) => {
  try {

    const { id } = req.params;

    await transportModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Transport removed successfully"
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
  addTransport,
  getAllTransportStudents,
  getTransportById,
  updateTransport,
  deleteTransport
};