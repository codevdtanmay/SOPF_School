const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatReceiptDate = (value = new Date()) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const renderRows = (rows = [], className = "row-item") =>
  rows
    .filter((row) => row && row.label)
    .map(
      (row) => `
        <div class="${className}${row.emphasis ? " dark" : ""}">
          <span class="row-lbl">${escapeHtml(row.label)}:</span>
          <span class="row-val${row.mono ? " font-mono" : ""}"${row.valueColor ? ` style="color: ${row.valueColor};"` : ""}>${escapeHtml(row.currency ? formatCurrency(row.value) : (row.value ?? ""))}</span>
        </div>
      `
    )
    .join("");

export const buildReceiptHtml = ({
  schoolName = "The School of Pansy Flowers",
  schoolSubtitle = "Changotola, Balaghat, MP, India • Since 2011",
  receiptType = "Receipt",
  receiptNo = "",
  receiptDate = new Date(),
  stampText = "Paid",
  details = [],
  paymentMode = "",
  amount = 0,
  amountCaption = "Net Paid Settle",
  summaryRows = [],
  signatureLabels = ["Authorized cashier", "Parent signatory"],
  footerText = "This receipt is system-generated and valid without a physical signature."
}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(`${receiptType}_${receiptNo}`)}</title>
      <style>
        @page {
          size: A4;
          margin: 14mm;
        }
        body {
          font-family: Arial, sans-serif;
          color: #1e293b;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
        }
        .page {
          width: 100%;
          display: flex;
          justify-content: center;
          box-sizing: border-box;
        }
        .receipt-card {
          background-color: #ffffff;
          width: 100%;
          max-width: 760px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08);
          padding: 34px;
          position: relative;
          box-sizing: border-box;
        }
        .paid-stamp {
          position: absolute;
          top: 24px;
          right: 30px;
          border: 3px solid #10b981;
          border-radius: 6px;
          color: #10b981;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 900;
          padding: 4px 8px;
          transform: rotate(15deg);
          opacity: 0.85;
          letter-spacing: 2px;
        }
        .brand-header {
          text-align: center;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }
        .brand-logo-txt {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #1e293b;
          text-transform: uppercase;
          margin: 0;
        }
        .brand-sub {
          font-size: 10px;
          color: #64748b;
          font-weight: bold;
          margin-top: 4px;
        }
        .receipt-title-box {
          background-color: #1e293b;
          color: white;
          text-align: center;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          display: inline-block;
          margin: 15px auto 0 auto;
          text-transform: uppercase;
        }
        .bill-details {
          font-size: 12px;
        }
        .row-item,
        .summary-item {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .summary-item {
          border-bottom: 1px solid #e2e8f0;
        }
        .summary-item.dark {
          border-bottom: 1px solid #cbd5e1;
          font-weight: bold;
        }
        .row-lbl {
          color: #64748b;
          font-weight: 600;
        }
        .row-val {
          color: #0f172a;
          font-weight: bold;
          text-align: right;
          word-break: break-word;
        }
        .font-mono {
          font-family: "Courier New", monospace;
        }
        .amount-highlight-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 22px 0;
        }
        .amount-caption {
          font-size: 10px;
          font-weight: bold;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 1px;
        }
        .amount-txt {
          font-size: 22px;
          font-weight: 900;
          color: #10b981;
        }
        .signatures-area {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 44px;
          font-size: 11px;
          color: #475569;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .line {
          width: 100%;
          border-bottom: 1px solid #94a3b8;
          margin-bottom: 6px;
        }
        .footer-note {
          margin-top: 18px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
        }
        .section-title {
          margin: 18px 0 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="receipt-card">
          <div class="paid-stamp">${escapeHtml(stampText)}</div>

          <div class="brand-header">
            <h1 class="brand-logo-txt">${escapeHtml(schoolName)}</h1>
            <div class="brand-sub">${escapeHtml(schoolSubtitle)}</div>
            <div><span class="receipt-title-box">${escapeHtml(receiptType)}</span></div>
          </div>

          <div class="bill-details">
            <div class="row-item">
              <span class="row-lbl">Receipt Number</span>
              <span class="row-val font-mono">${escapeHtml(receiptNo)}</span>
            </div>
            <div class="row-item">
              <span class="row-lbl">Payment Date</span>
              <span class="row-val">${escapeHtml(formatReceiptDate(receiptDate))}</span>
            </div>

            ${renderRows(details)}

            ${paymentMode ? `
              <div class="row-item">
                <span class="row-lbl">Mode of Payment</span>
                <span class="row-val">${escapeHtml(paymentMode)}</span>
              </div>
            ` : ""}

            <div class="amount-highlight-box">
              <div class="amount-caption">${escapeHtml(amountCaption)}</div>
              <div class="amount-txt">${escapeHtml(formatCurrency(amount))}</div>
            </div>

            <div class="section-title">Receipt Summary</div>
            ${renderRows(summaryRows, "summary-item")}
          </div>

          <div class="signatures-area">
            <div class="signature-box">
              <div class="line"></div>
              <div>${escapeHtml(signatureLabels[0] || "Authorized cashier")}</div>
            </div>
            <div class="signature-box">
              <div class="line"></div>
              <div>${escapeHtml(signatureLabels[1] || "Parent signatory")}</div>
            </div>
          </div>

          <div class="footer-note">${escapeHtml(footerText)}</div>
        </div>
      </div>
    </body>
  </html>
`;

export { escapeHtml, formatCurrency, formatReceiptDate };
