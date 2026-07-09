import express from "express";
import transportPaymentController from "../controllers/transportPayment.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();

// Collect Transport Fee
router.post(
  "/collect",
  authMiddleware,
  
  transportPaymentController.collectTransportFee
);

// Payment History
router.get(
  "/history",
  authMiddleware,
 
  transportPaymentController.getPaymentHistory
);

// Dashboard
router.get(
  "/dashboard",
  authMiddleware,

  transportPaymentController.getDashboard
);

// Monthly Report
router.get(
  "/monthly-report",
  authMiddleware,

  transportPaymentController.getMonthlyReport
);

// Pending Students
router.get(
  "/pending",
  authMiddleware,
 
  transportPaymentController.getPendingStudents
);
router.get(
  "/route-report",
  authMiddleware,
  transportPaymentController.getRouteReport
);

export default router;