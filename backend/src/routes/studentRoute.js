
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import studentController from "../controllers/studentController.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router()

router.post("/add", authMiddleware, authorize("admin"), studentController.addStudent)
router.get("/promotion/academic-years", authMiddleware, authorize("admin"), studentController.getPromotionAcademicYears)
router.get("/promotion/history", authMiddleware, authorize("admin"), studentController.getPromotionHistory)
router.post("/promotion", authMiddleware, authorize("admin"), studentController.promoteStudents)
router.get("/:id/fee-preview", authMiddleware, authorize("admin", "teacher"), studentController.getFeePreview)
router.get("/:studentId/financial-history", authMiddleware, authorize("admin"), studentController.getStudentFinancialHistory)
router.get("/", authMiddleware, authorize("admin", "teacher"), studentController.getStudents)
router.get("/:id", authMiddleware, authorize("admin", "teacher"), studentController.getStudentbyId);
router.patch("/:id", authMiddleware, authorize("admin" ), studentController.updatebyId)
router.delete("/:id", authMiddleware, authorize("admin" ), studentController.deletebyId)

export default router
