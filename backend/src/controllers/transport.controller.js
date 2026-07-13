import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";
import transportPaymentModel from "../models/transportPayment.model.js";
import { getCurrentAcademicYearDoc, resolveStudentPlacement } from "../utils/studentPlacement.js";

const formatClassName = (className = "", section = "") => {
  const cls = String(className || "").trim();
  const sec = String(section || "").trim();

  if (!cls) {
    return "";
  }

  return sec ? `${cls}-${sec}` : cls;
};

const parseMonthlyCharge = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
};

const resolveCurrentTransportPlacement = async (student) => {
  const academicYearDoc = await getCurrentAcademicYearDoc();
  return resolveStudentPlacement(student, academicYearDoc?.label || "");
};


const addTransport = async (req, res) => {
  try {
    const {
      studentId,
      routeName,
      pickupPoint,
      monthlyCharge,
      joiningDate
    } = req.body;

    const numericMonthlyCharge = parseMonthlyCharge(monthlyCharge);

    if (numericMonthlyCharge == null) {
      return res.status(400).json({
        success: false,
        message: "Monthly charge is required and must be greater than 0"
      });
    }

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
      monthlyCharge: numericMonthlyCharge,
      joiningDate
    });

    const populatedTransport = await transportModel.findById(
      transport._id
    ).populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "name email"
      }
    });
    const placement = populatedTransport.studentId
      ? await resolveCurrentTransportPlacement(populatedTransport.studentId)
      : null;

    return res.status(201).json({
      success: true,
      message: "Transport assigned successfully",
      transport: {
        id: populatedTransport._id,
        studentId: populatedTransport.studentId?._id,
        name: populatedTransport.studentId?.userId?.name,
        email: populatedTransport.studentId?.userId?.email,
        admissionNo: populatedTransport.studentId?.admissionNo,
        className: formatClassName(placement?.className, placement?.section),
        academicYear: placement?.academicYear || "",
        routeName: populatedTransport.routeName,
        pickupPoint: populatedTransport.pickupPoint,
        monthlyCharge: populatedTransport.monthlyCharge,
        joiningDate: populatedTransport.joiningDate,
        status: populatedTransport.status
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

const getAllTransportStudents = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentAcademicYearDoc = await getCurrentAcademicYearDoc();

    const transports = await transportModel
      .find()
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      });

    const formattedTransports = await Promise.all(
      transports
        .filter((transport) => Boolean(transport.studentId))
        .map(async (transport) => {
          const placement = await resolveStudentPlacement(
            transport.studentId,
            currentAcademicYearDoc?.label || ""
          );
          const payment = await transportPaymentModel.findOne({
            studentId: transport.studentId._id,
            month: currentMonth,
            year: currentYear
          });

          return {

            id: transport._id,

            studentId: transport.studentId?._id,

            name: transport.studentId?.userId?.name,

            email: transport.studentId?.userId?.email,

            admissionNo: transport.studentId?.admissionNo,

            className: payment?.className
              ? formatClassName(payment.className, payment.section)
              : formatClassName(placement.className, placement.section),

            routeName: transport.routeName,

            pickupPoint: transport.pickupPoint,

            monthlyCharge: transport.monthlyCharge,

            joiningDate: transport.joiningDate,

            // Preserve transport assignment status for roster UIs.
            status: transport.status,

            // Expose current-month payment state separately.
            paymentStatus: payment ? payment.status : "Pending",

            paidAmount: payment ? payment.paidAmount : 0,

            dueAmount: payment
              ? payment.dueAmount
              : transport.monthlyCharge,

            receiptNo: payment?.receiptNo || null,

            academicYear:
              payment?.academicYear ||
              placement.academicYear ||
              currentAcademicYearDoc?.label ||
              "",

            paymentDate: payment?.paymentDate || null

          };
        })
    );

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
    const numericMonthlyCharge = parseMonthlyCharge(req.body.monthlyCharge);

    if (numericMonthlyCharge == null) {
      return res.status(400).json({
        success: false,
        message: "Monthly charge is required and must be greater than 0"
      });
    }

    const transport = await transportModel.findById(id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport record not found"
      });
    }

    const updated = await transportModel
  .findByIdAndUpdate(
    id,
    {
      ...req.body,
      monthlyCharge: numericMonthlyCharge
    },
    { returnDocument: "after" }
  )
  .populate({
    path: "studentId",
    populate: {
      path: "userId",
      select: "name email"
    }
  });
    const placement = updated.studentId
      ? await resolveCurrentTransportPlacement(updated.studentId)
      : null;

return res.status(200).json({
  success: true,
  transport: {
    id: updated._id,
    studentId: updated.studentId?._id,
    name: updated.studentId?.userId?.name,
    email: updated.studentId?.userId?.email,
    admissionNo: updated.studentId?.admissionNo,
    className: formatClassName(placement?.className, placement?.section),
    academicYear: placement?.academicYear || "",
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
