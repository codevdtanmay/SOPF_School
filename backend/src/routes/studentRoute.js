
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import studentController from "../controllers/studentController.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router()

router.post("/add", authMiddleware, authorize("admin"), studentController.addStudent)
router.get("/", authMiddleware, authorize("admin", "teacher"), studentController.getStudents)
router.get("/:id", authMiddleware, authorize("admin", "teacher"), studentController.getStudentbyId);
router.patch("/:id", authMiddleware, authorize("admin" ), studentController.updatebyId)
router.delete("/:id", authMiddleware, authorize("admin" ), studentController.deletebyId)

export default router