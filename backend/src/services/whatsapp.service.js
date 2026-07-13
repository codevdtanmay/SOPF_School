import "../config/env.js";
import axios from "axios";
import generateReceiptPdf from "../utils/generateReceiptPdf.js";

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

console.log("WhatsApp env loaded:", Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID));

const normalizeWhatsAppNumber = (value) =>
  String(value || "").replace(/\D/g, "");

const whatsappMessagesUrl = () =>
  `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

const whatsappMediaUrl = () =>
  `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/media`;

const formatTransportReceiptDate = (value = new Date()) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const formatTransportBillingCycle = (month, year) => {
  const monthLabels = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const numericMonth = Number(month);
  const monthLabel = monthLabels[numericMonth] || month || "N/A";

  return `${monthLabel} ${year || ""}`.trim();
};

const formatFeeInstallmentLabel = (value) => String(value || "").trim() || "N/A";

const buildTransportReceiptText = (receipt = {}) => {
  const paidAmount = Number(receipt.currentPaidAmount ?? receipt.paidAmount ?? 0);
  const dueAmount = Number(receipt.dueAmount ?? 0);

  return `🏫 *The School of Pansy Flowers*

Dear Parent,

We have successfully received your transport fee payment.

👤 *Student:* ${receipt.studentName || "N/A"}
🆔 *Admission No:* ${receipt.admissionNo || "N/A"}
🏫 *Class:* ${receipt.className || "N/A"}
🚌 *Route:* ${receipt.routeName || "N/A"}
📍 *Pickup Point:* ${receipt.pickupPoint || "N/A"}
📅 *Billing Cycle:* ${formatTransportBillingCycle(receipt.month, receipt.year)}

💰 *Paid:* ₹${paidAmount.toLocaleString("en-IN")}
⏳ *Due:* ₹${dueAmount.toLocaleString("en-IN")}

💳 *Payment Mode:* ${receipt.paymentMethod || "N/A"}
🧾 *Receipt No:* ${receipt.receiptNo || "N/A"}
🕒 *Payment Date:* ${formatTransportReceiptDate(receipt.paymentDate || new Date())}

Thank you.

*The School of Pansy Flowers*`;
};

const buildFeeReceiptText = (receipt = {}) => {
  const paidAmount = Number(receipt.amount ?? receipt.paidAmount ?? 0);
  const dueAmount = Number(receipt.dueAmountRemaining ?? receipt.dueAmount ?? 0);

  return `🏫 *The School of Pansy Flowers*

Dear Parent,

We have successfully received your fee payment.

👤 *Student:* ${receipt.studentName || "N/A"}
🆔 *Admission No:* ${receipt.admissionNo || "N/A"}
🏫 *Class:* ${receipt.className || "N/A"}
📚 *Academic Year:* ${receipt.academicYear || "N/A"}

📦 *Installment:* ${formatFeeInstallmentLabel(receipt.month)}

💰 *Paid:* ₹${paidAmount.toLocaleString("en-IN")}
⏳ *Due:* ₹${dueAmount.toLocaleString("en-IN")}

💳 *Payment Mode:* ${receipt.paymentMethod || "N/A"}
🧾 *Receipt No:* ${receipt.receiptNo || "N/A"}
🕒 *Payment Date:* ${formatTransportReceiptDate(receipt.paymentDate || new Date())}

Thank you.

*The School of Pansy Flowers*`;
};

const sendWhatsAppRequest = async (body) => {
  const response = await axios.post(whatsappMessagesUrl(), body, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  return response;
};

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

    const response = await sendWhatsAppRequest({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: message
      }
    });

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

const uploadWhatsAppMedia = async ({ buffer, filename, mimeType }) => {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType || "application/pdf");
  formData.append("file", new Blob([buffer], { type: mimeType || "application/pdf" }), filename);

  const response = await fetch(whatsappMediaUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `WhatsApp media upload failed with status ${response.status}`
    );
  }

  if (!data?.id) {
    throw new Error("WhatsApp media upload succeeded without returning a media id");
  }

  return data.id;
};

const sendDocumentMessage = async ({
  phone,
  mediaId,
  filename,
  caption = ""
}) => {
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

  const response = await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      id: mediaId,
      filename,
      caption
    }
  });

  console.log("WhatsApp document API response:", response.data);

  return {
    success: Boolean(response.data?.messages?.[0]?.id || response.status === 200),
    data: response.data
  };
};

const sendReceiptWithPdfFallback = async ({
  phone,
  receipt,
  receiptNo,
  pdfGenerator = generateReceiptPdf,
  mediaUploader = uploadWhatsAppMedia,
  documentSender = sendDocumentMessage,
  textSender = sendTextMessage,
  pdfOptions,
  textMessage,
  logPrefix = "[receipt-pdf]",
  whatsappFailurePrefix = "[receipt-whatsapp]"
}) => {
  try {
    const pdfBuffer = await pdfGenerator(pdfOptions);

    try {
      const mediaId = await mediaUploader({
        buffer: pdfBuffer,
        filename: pdfOptions?.filename || `${receiptNo || Date.now()}.pdf`,
        mimeType: "application/pdf"
      });

      return await documentSender({
        phone,
        mediaId,
        filename: pdfOptions?.filename || `${receiptNo || Date.now()}.pdf`,
        caption: textMessage
      });
    } catch (error) {
      console.error(`${whatsappFailurePrefix} Failed to send PDF receipt`, receiptNo, error?.response?.data || error);
      return await textSender(phone, textMessage);
    }
  } catch (error) {
    console.error(`${logPrefix} Failed to generate PDF for payment`, receipt?.paymentId || receiptNo, error);

    try {
      return await textSender(phone, textMessage);
    } catch (textError) {
      console.error(`${whatsappFailurePrefix} Failed to send text fallback`, receipt?.paymentId || receiptNo, textError?.response?.data || textError);
      return {
        success: false,
        error: textError?.response?.data || textError?.message || String(textError)
      };
    }
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

export const sendTransportReceiptMessage = async ({
  phone,
  receipt,
  pdfGenerator = generateReceiptPdf,
  mediaUploader = uploadWhatsAppMedia,
  documentSender = sendDocumentMessage,
  textSender = sendTextMessage
} = {}) => {
  const receiptNo = receipt?.receiptNo || "";
  const textMessage = buildTransportReceiptText(receipt);
  return sendReceiptWithPdfFallback({
    phone,
    receipt,
    receiptNo,
    pdfGenerator,
    mediaUploader,
    documentSender,
    textSender,
    textMessage,
    pdfOptions: {
      receiptType: "Transport Service Receipt",
      stampText: receipt?.status || "Paid",
      receiptNo,
      receiptDate: receipt?.paymentDate || new Date(),
      details: [
        { label: "Student Name", value: receipt?.studentName || "" },
        { label: "Admission No", value: receipt?.admissionNo || "", mono: true },
        { label: "Class", value: receipt?.className || "" },
        { label: "Route", value: receipt?.routeName || "" },
        { label: "Pickup Point", value: receipt?.pickupPoint || "" },
        { label: "Billing Cycle", value: formatTransportBillingCycle(receipt?.month, receipt?.year) }
      ],
      paymentMode: receipt?.paymentMethod || "Cash",
      amount: receipt?.currentPaidAmount ?? receipt?.paidAmount ?? 0,
      amountCaption: "Paid This Time",
      summaryRows: [
        { label: "Monthly Charge", value: receipt?.monthlyCharge ?? 0, currency: true },
        { label: "Paid Amount This Time", value: receipt?.currentPaidAmount ?? receipt?.paidAmount ?? 0, valueColor: "#10b981", currency: true },
        { label: "Due Amount", value: receipt?.dueAmount ?? 0, valueColor: "#ef4444", emphasis: true, currency: true },
        { label: "Status", value: receipt?.status || "Pending" }
      ],
      footerText: "Transport fee receipt generated automatically after payment.",
      filename: `TransportReceipt_${receiptNo || Date.now()}.pdf`
    },
    logPrefix: "[receipt-pdf]",
    whatsappFailurePrefix: "[receipt-whatsapp]"
  });
};

export const sendFeeReceiptPdfMessage = async ({
  phone,
  receipt,
  pdfGenerator = generateReceiptPdf,
  mediaUploader = uploadWhatsAppMedia,
  documentSender = sendDocumentMessage,
  textSender = sendTextMessage
} = {}) => {
  const receiptNo = receipt?.receiptNo || "";
  const textMessage = buildFeeReceiptText(receipt);

  return sendReceiptWithPdfFallback({
    phone,
    receipt,
    receiptNo,
    pdfGenerator,
    mediaUploader,
    documentSender,
    textSender,
    textMessage,
    pdfOptions: {
      receiptType: "Fee Settlement Receipt",
      stampText: receipt?.status || "Paid",
      receiptNo,
      receiptDate: receipt?.paymentDate || new Date(),
      details: [
        { label: "Student Name", value: receipt?.studentName || "" },
        { label: "Admission No", value: receipt?.admissionNo || "", mono: true },
        { label: "Academic Class", value: `${receipt?.className || ""}${receipt?.section ? `-${receipt.section}` : ""}` },
        { label: "Academic Year", value: receipt?.academicYear || "" },
        ...(receipt?.month ? [{ label: "Installment Month", value: receipt.month }] : []),
        ...(receipt?.category ? [{ label: "Category", value: receipt.category }] : []),
        ...(receipt?.village ? [{ label: "Village", value: receipt.village }] : [])
      ],
      paymentMode: receipt?.paymentMethod || "Cash",
      amount: receipt?.amount ?? receipt?.paidAmount ?? 0,
      amountCaption: "Net Paid Settle",
      summaryRows: [
        { label: "Tution Fees Master Total", value: receipt?.totalFee ?? 0, currency: true },
        { label: "Cumulative Paid Fees", value: receipt?.paidAmountTotal ?? receipt?.paidAmount ?? 0, valueColor: "#10b981", currency: true },
        { label: "Remaining Due Fees", value: receipt?.dueAmountRemaining ?? receipt?.dueAmount ?? 0, valueColor: "#ef4444", emphasis: true, currency: true }
      ],
      footerText: "Tuition fee receipt generated automatically after payment.",
      filename: `FeeReceipt_${receiptNo || Date.now()}.pdf`
    },
    logPrefix: "[receipt-pdf]",
    whatsappFailurePrefix: "[receipt-whatsapp]"
  });
};
