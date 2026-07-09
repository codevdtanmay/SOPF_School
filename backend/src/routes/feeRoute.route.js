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
router.get(
  "/student/:id",
  authMiddleware,
  feeController.getStudentFeeDetails
);
router.get(
  "/student/:id/history",
  authMiddleware,
  feeController.getPaymentHistory
);
router.get(
  "/dashboard",
  authMiddleware,
  feeController.getFeeDashboard
);
router.get("/", feeController.getAllFees);
router.get("/monthly-report", feeController.getMonthlyFeeReport);
export default router;