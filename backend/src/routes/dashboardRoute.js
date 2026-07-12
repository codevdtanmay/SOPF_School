import express from "express";
import dashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/stats", authMiddleware, authorize("admin"), dashboardController.getDashboardStats);
router.get("/fee-summary", authMiddleware, authorize("admin"), dashboardController.getFeeSummary);
router.get("/activities", authMiddleware, authorize("admin"), dashboardController.getActivities);

export default router;
