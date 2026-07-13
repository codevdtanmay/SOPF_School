import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import academicYearController from "../controllers/academicYearController.js";

const router = express.Router();

router.get("/", authMiddleware, authorize("admin"), academicYearController.getAcademicYears);
router.patch("/:id/current", authMiddleware, authorize("admin"), academicYearController.setCurrentAcademicYear);
router.post("/next-session", authMiddleware, authorize("admin"), academicYearController.addNextSession);

export default router;
