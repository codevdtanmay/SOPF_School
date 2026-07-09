import transportPaymentModel from "../models/transportPayment.model.js";
import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";



// ==============================
// Collect Transport Fee
// ==============================

const collectTransportFee = async (req, res) => {
  try {

    const {
      studentId,
      month,
      year,
      paymentMethod,
      remarks
    } = req.body;

    if (!studentId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Student, month and year are required"
      });
    }

    const transport = await transportModel.findOne({
      studentId
    });

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport record not found"
      });
    }

    const alreadyPaid =
      await transportPaymentModel.findOne({
        studentId,
        month,
        year
      });

    if (alreadyPaid) {
      return res.status(409).json({
        success: false,
        message: "Transport fee already paid for this month"
      });
    }

    const receiptNo =
      `TR-${Date.now()}`;

    const payment =
      await transportPaymentModel.create({

        studentId,

        transportId: transport._id,

        receiptNo,

        month,

        year,

        amount:
          transport.monthlyCharge,

        paymentMethod:
          paymentMethod || "Cash",

        remarks
      });

    return res.status(201).json({
      success: true,
      message: "Transport fee collected successfully",
      payment
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
          sum + payment.amount,
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
            sum + payment.amount,
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
      year
    } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year required"
      });
    }

    const payments =
      await transportPaymentModel
        .find({
          month: Number(month),
          year: Number(year)
        })
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name"
          }
        })
        .populate("transportId");

    const totalCollection =
      payments.reduce(
        (sum, payment) =>
          sum + payment.amount,
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

      const payment =
        await transportPaymentModel.findOne({

          studentId:
            transport.studentId._id,

          month:
            currentMonth,

          year:
            currentYear

        });

      if (!payment) {

        pending.push({
          student:
            transport.studentId.userId.name,

          admissionNo:
            transport.studentId.admissionNo,

          route:
            transport.routeName,

          monthlyCharge:
            transport.monthlyCharge
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
          (sum, p) => sum + p.amount,
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