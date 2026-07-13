import transportPaymentModel from "../models/transportPayment.model.js";
import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";
import {
  buildTransportPaymentSnapshot,
  normalizeAcademicYear
} from "../utils/feeLifecycle.js";

const parseMonthlyCharge = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
};



// ==============================
// Collect Transport Fee
// ==============================

const collectTransportFee = async (req, res) => {
  try {
    const {
      studentId,
      month,
      year,
      paidAmount,
      paymentMethod,
      remarks
    } = req.body;

    if (!studentId || !month || !year || paidAmount == null) {
      return res.status(400).json({
        success: false,
        message: "Student, month, year and paid amount are required"
      });
    }

    const transport = await transportModel.findOne({ studentId });

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport record not found"
      });
    }

    const monthlyCharge = parseMonthlyCharge(transport.monthlyCharge);

    if (monthlyCharge == null) {
      return res.status(400).json({
        success: false,
        message: "Transport monthly charge is missing or invalid"
      });
    }

    if (Number(paidAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount"
      });
    }

    if (Number(paidAmount) > monthlyCharge) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot exceed monthly charge."
      });
    }

    const paidNow = Number(paidAmount);

    let payment = await transportPaymentModel.findOne({
      studentId,
      month,
      year
    });

    const receiptNo = `TR-${year}${String(month).padStart(2, "0")}-${Date.now()
      .toString()
      .slice(-5)}`;

    const totalAmount = monthlyCharge;
    const student = await studentModel.findById(studentId).populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!payment) {
      const dueAmount = totalAmount - paidNow;

      payment = await transportPaymentModel.create(buildTransportPaymentSnapshot({
        student,
        transport,
        month,
        year,
        receiptNo,
        amount: totalAmount,
        paidAmount: paidNow,
        dueAmount,
        status: dueAmount === 0 ? "Paid" : "Partial",
        paymentMethod: paymentMethod || "Cash",
        remarks
      }));
    } else {

      // Prevent paying more than due amount
      if (payment.paidAmount + paidNow > payment.amount) {
        return res.status(400).json({
          success: false,
          message: "Payment exceeds due amount."
        });
      }

      payment.paidAmount += paidNow;
      payment.dueAmount = payment.amount - payment.paidAmount;

      if (payment.dueAmount <= 0) {
        payment.dueAmount = 0;
        payment.status = "Paid";
      } else {
        payment.status = "Partial";
      }

      payment.paymentMethod = paymentMethod || payment.paymentMethod;
      payment.remarks = remarks || payment.remarks;
      payment.paymentDate = new Date();

      await payment.save();
    }

    await payment.populate([
      {
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      },
      {
        path: "transportId"
      }
    ]);

    return res.status(201).json({
      success: true,
      message: "Transport fee collected successfully",
      payment: {
        ...payment.toObject(),
        currentPaidAmount: paidNow
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

// ==============================
// Payment History
// ==============================

const getPaymentHistory = async (req, res) => {

  try {

    const payments =
      await transportPaymentModel
        .find()
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name email"
          }
        })
        .populate("transportId")
        .sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      payments
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }

};



// ==============================
// Dashboard
// ==============================

const getDashboard = async (req, res) => {

  try {

    const transports =
      await transportModel.find();

    const payments =
      await transportPaymentModel.find();

    const totalStudents =
      transports.length;

   const totalCollection =
  payments.reduce(
    (sum, payment) =>
      sum + payment.paidAmount,
    0
  );

    const currentMonth =
      new Date().getMonth() + 1;

    const currentYear =
      new Date().getFullYear();

    const currentMonthCollection =
  payments
    .filter(
      payment =>
        payment.month === currentMonth &&
        payment.year === currentYear
    )
    .reduce(
      (sum, payment) =>
        sum + payment.paidAmount,
      0
    );
    return res.status(200).json({

      success: true,

      totalStudents,

      totalCollection,

      currentMonthCollection

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }

};



// ==============================
// Monthly Report
// ==============================

const getMonthlyReport = async (req, res) => {

  try {

    const {
      month,
      year,
      academicYear
    } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year required"
      });
    }

    const paymentFilter = {
      month: Number(month),
      year: Number(year)
    };

    if (academicYear) {
      paymentFilter.academicYear = academicYear;
    }

    const payments =
      await transportPaymentModel
        .find(paymentFilter)
        .sort({ paymentDate: -1 });

  const totalCollection =
  payments.reduce(
    (sum, payment) =>
      sum + payment.paidAmount,
    0
  );

    return res.status(200).json({

      success: true,

      month,

      year,

      totalCollection,

      totalPayments:
        payments.length,

      payments

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }

};



// ==============================
// Pending Students
// ==============================

const getPendingStudents = async (req, res) => {

  try {

    const currentMonth =
      new Date().getMonth() + 1;

    const currentYear =
      new Date().getFullYear();

    const transports =
      await transportModel
        .find()
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name"
          }
        });

    const pending = [];

    for (const transport of transports) {
      if (!transport.studentId) {
        continue;
      }

      const payment =
        await transportPaymentModel.findOne({

          studentId:
            transport.studentId._id,

          month:
            currentMonth,

          year:
            currentYear

        });

      if (!payment || payment.status !== "Paid") {
        pending.push({
          student: transport.studentId.userId?.name || "Unknown Student",
          admissionNo: transport.studentId.admissionNo || "",
          route: transport.routeName,
          monthlyCharge: transport.monthlyCharge,
          status: payment ? payment.status : "Pending",
          dueAmount: payment ? payment.dueAmount : transport.monthlyCharge
        });
      }
    }

    return res.status(200).json({

      success: true,

      pending

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message: "Internal Server Error"

    });

  }

};
const getRouteReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    const transports = await transportModel.find({ status: "Active" });

    const payments = await transportPaymentModel
      .find({
        month: Number(month),
        year: Number(year)
      })
      .populate("transportId");

    const routes = [...new Set(transports.map(t => t.routeName))];

    const report = routes.map(route => {
      const studentsCount = transports.filter(
        t => t.routeName === route
      ).length;

      const collection = payments
        .filter(
          p => p.transportId?.routeName === route
        )
        .reduce(
    (sum, p) => sum + p.paidAmount,
    0
);

      return {
        route,
        studentsCount,
        collection
      };
    });

    return res.status(200).json({
      success: true,
      report
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


export default {

  collectTransportFee,

  getPaymentHistory,

  getDashboard,

  getMonthlyReport,

  getPendingStudents,

  getRouteReport

};
