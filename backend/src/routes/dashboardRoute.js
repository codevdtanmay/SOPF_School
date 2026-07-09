import express from "express";
import dashboardController from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/stats", dashboardController.getDashboardStats);
router.get("/fee-summary", dashboardController.getFeeSummary);
router.get("/activities", dashboardController.getActivities);

export default router;