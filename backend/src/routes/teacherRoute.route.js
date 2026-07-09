import express from "express";
import teacherController from "../controllers/teacherController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  authorize("admin"),
  teacherController.createTeacher
);

router.get(
  "/",
  authMiddleware,
  authorize("admin"),
  teacherController.getAllTeachers
);

router.get(
  "/:id",
  authMiddleware,
  authorize("admin"),
  teacherController.getTeacherById
);

router.patch(
  "/:id",
  authMiddleware,
  authorize("admin"),
  teacherController.updateTeacher
);

router.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  teacherController.deleteTeacher
);

export default router;

