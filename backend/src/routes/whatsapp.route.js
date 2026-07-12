import express from "express";
import { sendTextMessage } from "../services/whatsapp.service.js";


const router = express.Router();

router.post("/test", async (req, res) => {
  const { phone } = req.body;

  const result = await sendTextMessage(
    phone,
    "🏫 Hello from The School of Pansy Flowers ERP!"
  );

  if (result.success) {
    return res.json(result.data);
  }

  return res.status(500).json(result.error);
});

export default router;