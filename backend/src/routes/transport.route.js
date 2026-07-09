import express from "express";
import transportController from "../controllers/transport.controller.js";

const router = express.Router();

router.post("/", transportController.addTransport);

router.get("/", transportController.getAllTransportStudents);

router.get("/:id", transportController.getTransportById);

router.put("/:id", transportController.updateTransport);

router.delete("/:id", transportController.deleteTransport);

export default router;