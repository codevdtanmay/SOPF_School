import express from "express";
import feeController from "../controllers/feeController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/collect",
  authMiddleware,
  authorize("admin"),
  feeController.collectFee
);
router.post(
  "/:receiptNo/whatsapp",
  authMiddleware,
  authorize("admin"),
  feeController.sendFeeReceiptWhatsapp
);
router.get(
  "/student/:id",
  authMiddleware,
  authorize("admin"),
  feeController.getStudentFeeDetails
);
router.get(
  "/student/:id/history",
  authMiddleware,
  authorize("admin"),
  feeController.getPaymentHistory
);
router.get(
  "/dashboard",
  authMiddleware,
  authorize("admin"),
  feeController.getFeeDashboard
);
router.get("/", authMiddleware, authorize("admin"), feeController.getAllFees);
router.get("/monthly-report", authMiddleware, authorize("admin"), feeController.getMonthlyFeeReport);
export default router;
