import express from "express";
import transportController from "../controllers/transport.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, authorize("admin"), transportController.addTransport);

router.get("/", authMiddleware, authorize("admin"), transportController.getAllTransportStudents);

router.get("/:id", authMiddleware, authorize("admin"), transportController.getTransportById);

router.put("/:id", authMiddleware, authorize("admin"), transportController.updateTransport);

router.delete("/:id", authMiddleware, authorize("admin"), transportController.deleteTransport);

export default router;
