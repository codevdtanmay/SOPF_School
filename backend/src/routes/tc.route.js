import express from "express";
import tcController from "../controllers/tc.controller.js";

const router = express.Router();

router.post("/", tcController.generateTC);
router.get("/", tcController.getAllTCs);
router.get("/:id", tcController.getTCById);
router.patch("/:id/cancel", tcController.cancelTC);

export default router;