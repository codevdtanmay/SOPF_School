import express from "express";
import feeStructureController from "../controllers/feeStructureController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();
router.post(
  "/",
  authMiddleware,
  authorize("admin"),
  feeStructureController.createFeeStructure
);
router.get(
  "/",
  authMiddleware,
  feeStructureController.getAllFeeStructures
);
router.get(
  "/:id",
  authMiddleware,
  feeStructureController.getFeeStructureById
);
router.patch(
  "/:id",
  authMiddleware,
  authorize("admin"),
  feeStructureController.updateFeeStructure
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  feeStructureController.deleteFeeStructure
);
export default router;