import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";
import transportPaymentModel from "../models/transportPayment.model.js";

const parseMonthlyCharge = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
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

    return res.status(201).json({
      success: true,
      message: "Transport assigned successfully",
      transport: {
        id: populatedTransport._id,
        studentId: populatedTransport.studentId?._id,
        name: populatedTransport.studentId?.userId?.name,
        email: populatedTransport.studentId?.userId?.email,
        admissionNo: populatedTransport.studentId?.admissionNo,
        className: `${populatedTransport.studentId?.class}-${populatedTransport.studentId?.section}`,
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

      transports.map(async (transport) => {

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
            ? `${payment.className}${payment.section ? `-${payment.section}` : ""}`
            : `${transport.studentId?.class}-${transport.studentId?.section}`,

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

          academicYear: payment?.academicYear || transport.studentId?.academicYear || "",

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
