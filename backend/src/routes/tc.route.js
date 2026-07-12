import express from "express";
import tcController from "../controllers/tc.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, authorize("admin"), tcController.generateTC);
router.get("/", authMiddleware, authorize("admin"), tcController.getAllTCs);
router.get("/:id", authMiddleware, authorize("admin"), tcController.getTCById);
router.patch("/:id/cancel", authMiddleware, authorize("admin"), tcController.cancelTC);

export default router;
