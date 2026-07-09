import studentModel from "../models/student.model.js";
import feeStructureModel from "../models/feeStructure.js";
import computeInstallmentDetails from "../utils/installmentCalculator.js";
import feeHistoryModel from "../models/feeHistory.model.js";

const collectFee = async (req, res) => {
  try {

    const {
      studentId,
      amountPaid,
      paymentMethod
    } = req.body;

    if (!studentId || Number(amountPaid) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid student ID and payment amount are required"
      });
    }

    const student =
      await studentModel.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (amountPaid > student.dueAmount) {
      return res.status(400).json({
        success: false,
        message: "Amount exceeds due amount"
      });
    }

    const receiptNo =
      `REC-${Date.now()}`;

    student.paidAmount += Number(amountPaid);
        student.dueAmount =
      student.totalFee -
      student.paidAmount;

    if (
      student.paidAmount >=
      student.totalFee
    ) {

      student.status = "Paid";

    } else if (
      student.paidAmount > 0
    ) {

      student.status = "Partial";

    } else {

      student.status = "Pending";

    }

  
  
    await feeHistoryModel.create({

  studentId: student._id,

  receiptNo,

  amount: Number(amountPaid),

  paymentMethod: paymentMethod || "Cash",

  paymentDate: new Date()

});




  

    await student.save();

   return res.status(200).json({
    success: true,
    message: "Fee Collected Successfully",
    receiptNo,
    student
});
  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        "Internal Server Error"
    });

  }
};

const getStudentFeeDetails = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    const student =
      await studentModel.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const structure =
      await feeStructureModel.findById(
        student.feeStructureId
      );
      if (!structure) {

  return res.status(404).json({

    success: false,

    message: "Fee structure not found"

  });

}

    const installments =
      computeInstallmentDetails(
        student.paidAmount,
        structure
      );

    return res.status(200).json({
      success: true,

      totalFee: student.totalFee,
      paidAmount: student.paidAmount,
      dueAmount: student.dueAmount,
      status: student.status,

      installments
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }

};

const getPaymentHistory = async (req, res) => {
    try {

        const { id } = req.params;

        const history = await feeHistoryModel
            .find({ studentId: id })
            .sort({ paymentDate: -1 });

        const student = await studentModel
            .findById(id)
            .populate("userId", "name");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        return res.status(200).json({
            success: true,
            studentName: student.userId.name,
            admissionNo: student.admissionNo,
            history
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};


const getFeeDashboard = async (req, res) => {
  try {

    const students = await studentModel.find({
  isDeleted: false
});

    const totalStudents = students.length;

    const totalCollected = students.reduce(
      (sum, student) => sum + student.paidAmount,
      0
    );

    const totalPending = students.reduce(
      (sum, student) => sum + student.dueAmount,
      0
    );

    const studentsWithDue = students.filter(
      student => student.dueAmount > 0
    ).length;

    const fullyPaidStudents = students.filter(
      student => student.status === "Paid"
    ).length;

    return res.status(200).json({
      success: true,
      totalStudents,
      totalCollected,
      totalPending,
      studentsWithDue,
      fullyPaidStudents
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};
const getAllFees = async (req, res) => {
  try {

    const {
      status,
      class: studentClass,
      section,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    }

    if (studentClass) {
      filter.class = studentClass;
    }

    if (section) {
      filter.section = section;
    }

    const skip = (Number(page) - 1) * Number(limit);

    let students = await studentModel
      .find(filter)
      .populate("userId", "name email")
      .sort({ class: 1, section: 1, rollNo: 1 })
      .skip(skip)
      .limit(Number(limit));

    if (search) {

      const keyword = search.toLowerCase();

      students = students.filter(student =>
        student.userId?.name
          ?.toLowerCase()
          .includes(keyword)

        ||

        student.admissionNo
          ?.toLowerCase()
          .includes(keyword)
      );
    }

    const totalStudents =
      await studentModel.countDocuments(filter);

    const formattedData = students.map(student => ({
      studentId: student._id,

      name: student.userId?.name,

      email: student.userId?.email,

      admissionNo: student.admissionNo,

      class: student.class,

      section: student.section,

      rollNo: student.rollNo,

      totalFee: student.totalFee,

      paidAmount: student.paidAmount,

      dueAmount: student.dueAmount,

      status: student.status
    }));

    return res.status(200).json({
      success: true,

      students: formattedData,

      pagination: {
        currentPage: Number(page),

        totalPages: Math.ceil(
          totalStudents / Number(limit)
        ),

        totalStudents,

        limit: Number(limit)
      }
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};
const getMonthlyFeeReport = async (req, res) => {
  try {

    const now = new Date();

    const month = Number(req.query.month) || (now.getMonth() + 1);

    const year = Number(req.query.year) || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 1);

    const payments = await feeHistoryModel
      .find({
        paymentDate: {
          $gte: startDate,
          $lt: endDate
        }
      })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .sort({ paymentDate: -1 });

    const totalCollection = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return res.status(200).json({
      success: true,
      month,
      year,
      totalCollection,
      totalTransactions: payments.length,
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

export default {
  collectFee,getStudentFeeDetails,getPaymentHistory,getFeeDashboard,getAllFees,getMonthlyFeeReport
};