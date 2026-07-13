import express from "express";
import transportPaymentController from "../controllers/transportPayment.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";


const router = express.Router();

// Collect Transport Fee
router.post(
  "/collect",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.collectTransportFee
);
router.post(
  "/:receiptNo/whatsapp",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.sendTransportFeeReceiptWhatsapp
);

// Payment History
router.get(
  "/history",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.getPaymentHistory
);

// Dashboard
router.get(
  "/dashboard",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.getDashboard
);

// Monthly Report
router.get(
  "/monthly-report",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.getMonthlyReport
);

// Pending Students
router.get(
  "/pending",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.getPendingStudents
);
router.get(
  "/route-report",
  authMiddleware,
  authorize("admin"),
  transportPaymentController.getRouteReport
);

export default router;
