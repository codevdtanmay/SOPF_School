import "../config/env.js";
import axios from "axios";

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

console.log("WhatsApp env loaded:", Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID));

const normalizeWhatsAppNumber = (value) =>
  String(value || "").replace(/\D/g, "");

export const sendTextMessage = async (phone, message) => {
  try {
    const to = normalizeWhatsAppNumber(phone);

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      return {
        success: false,
        error: "WhatsApp env vars are missing"
      };
    }

    if (!to) {
      return {
        success: false,
        error: "Recipient phone number is required"
      };
    }

    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp API response:", response.data);

    return {
      success: Boolean(response.data?.messages?.[0]?.id || response.status === 200),
      data: response.data,
    };
  } catch (error) {
    console.error(
      "WhatsApp Error:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};
export const sendFeeReceiptMessage = async ({
  phone,
 studentName,
  admissionNo,
  className,
  academicYear,
  installment,
  paidAmount,
  dueAmount,
  paymentMethod,
  receiptNo,
}) => {
  const message = `🏫 *The School of Pansy Flowers*

Dear Parent,

We have successfully received your fee payment.

👤 *Student:* ${studentName}
🆔 *Admission No:* ${admissionNo}
🏫 *Class:* ${className}
📚 *Academic Year:* ${academicYear}

📦 *Installment:* ${installment}

💰 *Paid:* ₹${Number(paidAmount).toLocaleString("en-IN")}
⏳ *Due:* ₹${Number(dueAmount).toLocaleString("en-IN")}

💳 *Payment Mode:* ${paymentMethod}
🧾 *Receipt No:* ${receiptNo}

Thank you.

*The School of Pansy Flowers*`;


  return sendTextMessage(phone, message);
};
