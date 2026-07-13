import transportPaymentModel from "../models/transportPayment.model.js";
import transportModel from "../models/transport.model.js";
import studentModel from "../models/student.model.js";
import { sendTransportReceiptMessage } from "../services/whatsapp.service.js";
import {
  buildTransportPaymentSnapshot,
  normalizeAcademicYear
} from "../utils/feeLifecycle.js";
import { resolveStudentPlacement } from "../utils/studentPlacement.js";

const MONTH_LABELS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const BILLING_MONTH_LABELS = [
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
  "April"
];

const isTransportBillingMonth = (month) => BILLING_MONTH_LABELS.includes(String(month || ""));

const getTransportAcademicYear = (month, year) => {
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) {
    return "";
  }

  if (!isTransportBillingMonth(MONTH_LABELS[monthNumber])) {
    return "";
  }

  if (monthNumber >= 6) {
    return `${yearNumber}-${String(yearNumber + 1).slice(-2)}`;
  }

  return `${yearNumber - 1}-${String(yearNumber).slice(-2)}`;
};

const getCurrentTransportCycle = (date = new Date()) => {
  const currentMonth = date.getMonth() + 1;
  const currentYear = date.getFullYear();

  if (currentMonth === 5) {
    return {
      month: 4,
      year: currentYear,
      academicYear: `${currentYear - 1}-${String(currentYear).slice(-2)}`
    };
  }

  const academicYear = getTransportAcademicYear(currentMonth, currentYear);

  return {
    month: currentMonth,
    year: currentYear,
    academicYear
  };
};

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

    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const academicYear = getTransportAcademicYear(monthNumber, yearNumber);

    if (!isTransportBillingMonth(MONTH_LABELS[monthNumber])) {
      return res.status(400).json({
        success: false,
        message: "May is a holiday month and cannot be billed for transport"
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "Unable to resolve transport academic year for the selected month"
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
      month: monthNumber,
      year: yearNumber,
      academicYear
    });

    const receiptNo = `TR-${yearNumber}${String(monthNumber).padStart(2, "0")}-${Date.now()
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

    const placement = await resolveStudentPlacement(student, academicYear);

    if (!payment) {
      const dueAmount = totalAmount - paidNow;

      payment = await transportPaymentModel.create(buildTransportPaymentSnapshot({
        student,
        transport,
        placement,
        month: monthNumber,
        year: yearNumber,
        academicYear,
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

    const paymentPayload = payment.toObject();
    const normalizedPhone = String(student.phone || "").replace(/\D/g, "");
    const recipientPhone = normalizedPhone
      ? (normalizedPhone.startsWith("91") ? normalizedPhone : `91${normalizedPhone}`)
      : "";

    if (recipientPhone) {
      res.once("finish", () => {
        void sendTransportReceiptMessage({
          phone: recipientPhone,
          receipt: {
            ...paymentPayload,
            paymentId: paymentPayload._id?.toString?.() || String(paymentPayload._id)
          }
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: "Transport fee collected successfully",
      payment: {
        ...paymentPayload,
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

const sendTransportFeeReceiptWhatsapp = async (req, res) => {
  try {
    const { receiptNo } = req.params;

    if (!receiptNo) {
      return res.status(400).json({
        success: false,
        message: "Receipt number is required"
      });
    }

    const payment = await transportPaymentModel
      .findOne({ receiptNo })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .populate("transportId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Transport payment not found"
      });
    }

    const student = payment.studentId?._id
      ? payment.studentId
      : await studentModel.findById(payment.studentId).populate("userId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!student.phone) {
      return res.status(400).json({
        success: false,
        message: "Student phone number is missing"
      });
    }

    const normalizedPhone = String(student.phone || "").replace(/\D/g, "");
    const phone = normalizedPhone.startsWith("91") ? normalizedPhone : `91${normalizedPhone}`;

    const result = await sendTransportReceiptMessage({
      phone,
      receipt: {
        ...payment.toObject()
      }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send transport receipt to WhatsApp",
        error: result.error || null
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transport receipt sent to WhatsApp successfully"
    });
  } catch (error) {
    console.error("Transport receipt WhatsApp error:", error);

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

    console.error(error);

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
    const currentCycle = getCurrentTransportCycle();
    const currentAcademicYear = currentCycle.academicYear;

    const transports =
      await transportModel.find();

    const payments =
      await transportPaymentModel.find({
        academicYear: currentAcademicYear
      });

    const totalStudents =
      transports.length;

   const totalCollection =
  payments.reduce(
    (sum, payment) =>
      sum + payment.paidAmount,
    0
  );

    const currentMonth = currentCycle.month;
    const currentYear = currentCycle.year;

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
      currentAcademicYear,

      totalCollection,

      currentMonthCollection

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

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (!isTransportBillingMonth(MONTH_LABELS[monthNumber])) {
      return res.status(400).json({
        success: false,
        message: "May is a holiday month and has no transport billing"
      });
    }

    const resolvedAcademicYear =
      normalizeAcademicYear(academicYear) || getTransportAcademicYear(monthNumber, yearNumber);

    const paymentFilter = {
      month: monthNumber,
      year: yearNumber
    };

    if (resolvedAcademicYear) {
      paymentFilter.academicYear = resolvedAcademicYear;
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

      academicYear: resolvedAcademicYear,

      totalCollection,

      totalPayments:
        payments.length,

      payments

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
// Pending Students
// ==============================

const getPendingStudents = async (req, res) => {

  try {
    const currentCycle = getCurrentTransportCycle();
    const currentMonth = currentCycle.month;
    const currentYear = currentCycle.year;
    const currentAcademicYear = currentCycle.academicYear;

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
            currentYear,

          academicYear: currentAcademicYear

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

    console.error(error);

    return res.status(500).json({

      success: false,

      message: "Internal Server Error"

    });

  }

};
const getRouteReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const academicYear = getTransportAcademicYear(monthNumber, yearNumber);

    if (!isTransportBillingMonth(MONTH_LABELS[monthNumber])) {
      return res.status(400).json({
        success: false,
        message: "May is a holiday month and has no transport billing"
      });
    }

    const transports = await transportModel.find({ status: "Active" });

    const payments = await transportPaymentModel
      .find({
        month: monthNumber,
        year: yearNumber,
        ...(academicYear ? { academicYear } : {})
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
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


export default {

  collectTransportFee,
  sendTransportFeeReceiptWhatsapp,

  getPaymentHistory,

  getDashboard,

  getMonthlyReport,

  getPendingStudents,

  getRouteReport

};
