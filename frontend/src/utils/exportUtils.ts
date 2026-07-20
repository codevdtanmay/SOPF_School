/**
 * Utility functions for exporting data from The School of Pansy Flowers portal
 * to Excel (CSV format) and high-quality printable PDF layouts.
 */

// Helper to escape CSV values safely to protect against CSV Injection and handle commas/quotes
const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
};

/**
 * Exports JSON array data to a standard CSV file that opens flawlessly in Excel.
 * Uses UTF-8 BOM so Excel decodes symbols like Rupee (₹) and accented letters correctly.
 */
export const exportToExcel = (data: any[], headers: string[], keys: string[], filename: string) => {
  const bom = '\ufeff';
  const headerLine = headers.map(escapeCSV).join(',');
  const rowLines = data.map(item => {
    return keys.map(key => {
      // Handle nested properties or formatting
      const value = item[key];
      if (typeof value === 'number') return value;
      return escapeCSV(value);
    }).join(',');
  });

  const csvContent = bom + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Renders a visually stunning, official printable directory page in a popup window
 * allowing immediate "Save as PDF" using standard native browser workflows.
 */
export const exportToPrintablePDF = (title: string, headers: string[], rows: string[][], filename: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export printable/PDF reports.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Compose html printout with gorgeous typography and styled tables
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Playfair+Display:wght@700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            padding: 40px;
            margin: 0;
            background-color: #ffffff;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #cbd5e1;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title-area {
            text-align: left;
          }
          .logo-placeholder {
            border: 2px solid #1e293b;
            border-radius: 50%;
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 11px;
            text-align: center;
            background-color: #1e293b;
            color: white;
            line-height: 1.2;
          }
          h1 {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 24px;
            margin: 0 0 5px 0;
            color: #0f172a;
          }
          h2 {
            font-size: 14px;
            margin: 0;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .metadata {
            font-size: 10px;
            color: #64748b;
            text-align: right;
          }
          .report-bar {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 30px;
          }
          th {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 12px 10px;
            border: 1px solid #1e293b;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            border-left: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            color: #334155;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body { padding: 20px; font-size: 10px; }
            button { display: none; }
            .no-print { display: none; }
          }
          .print-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: #1e293b;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 30px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgb(0,0,0,0.15);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-btn:hover {
            background-color: #0f172a;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">
          Print report / Save as PDF
        </button>

        <div class="header">
          <div class="title-area">
            <h1>The School of Pansy Flowers</h1>
            <h2>${title}</h2>
          </div>
          <div class="logo-placeholder">
            THE SCHOOL<br>OF PANSY<br>FLOWERS
          </div>
        </div>

        <div class="report-bar">
          <div>Report Class: Operational Audit Directory</div>
          <div class="metadata">Generated On: ${currentDate}</div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(val => `<td>${val}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <span>The School of Pansy Flowers ERP System • Confidential Audits</span>
          <span>Page 1 of 1</span>
        </div>

        <script>
          // Auto-focus print dialog on window opening
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Opens a highly professional, formatted academic fee receipt printable bill slip.
 * Embeds official Pansy Flowers watermarks, stamp layouts, and payment reference.
 */
export const printReceiptBill = (receipt: {
  receiptNo: string;
  studentName: string;
  amount: number;
  paymentMode: string;
  className: string;
  section?: string;
  academicYear?: string;
  month?: string;
  admissionNo: string;
  dueAmountRemaining: number;
  totalFee: number;
  paidAmountTotal: number;
  category?: string;
  village?: string;
  feeSnapshot?: {
    totalBeforeDiscount?: number;
    totalDiscount?: number;
    finalAmount?: number;
    concessions?: Array<{
      type?: string;
      discountType?: string;
      value?: number;
      amountDeducted?: number;
    }>;
  };
}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the official Receipt Printout.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt_${receipt.receiptNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            background-color: #f1f5f9;
            padding: 30px 10px;
            margin: 0;
            display: flex;
            justify-content: center;
          }
          .receipt-card {
            background-color: #ffffff;
            width: 450px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0,0,0,0.1), 0 2px 4px -2px rgb(0,0,0,0.1);
            padding: 35px;
            position: relative;
            box-sizing: border-box;
          }
          .brand-header {
            text-align: center;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .brand-logo-txt {
            font-size: 14px;
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
            space-y: 10px;
          }
          .row-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .row-item.dark {
            border-bottom: 1px solid #e2e8f0;
            font-weight: bold;
          }
          .row-lbl {
            color: #64748b;
            font-weight: 600;
          }
          .row-val {
            color: #0f172a;
            font-weight: bold;
          }
          .amount-highlight-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
          }
          .amount-txt {
            font-size: 22px;
            font-weight: 900;
            color: #10b981;
          }
          .paid-stamp {
            position: absolute;
            top: 25px;
            right: 35px;
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
          .signatures-area {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            font-size: 11px;
            color: #475569;
          }
          .signature-box {
            text-align: center;
            width: 140px;
          }
          .line {
            width: 100%;
            border-bottom: 1px solid #94a3b8;
            margin-bottom: 6px;
          }
          .print-ctrl-btn {
            background-color: #121824;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
            margin-bottom: 20px;
            width: 450px;
            text-align: center;
            box-sizing: border-box;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .print-ctrl-btn:hover {
            background-color: #000000;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .receipt-card {
              border: none;
              box-shadow: none;
              width: 100%;
              padding: 10px;
            }
            .print-ctrl-btn {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; flex-direction: column; align-items: center;">
          <button class="print-ctrl-btn" onclick="window.print()">
            Print Receipt / Save PDF
          </button>

          <div class="receipt-card">
            <div class="paid-stamp">Paid</div>

            <div class="brand-header">
              <h1 class="brand-logo-txt">The School of Pansy Flowers</h1>
              <div class="brand-sub">Changotola, Balaghat, MP, India • Since 2011</div>
              <div><span class="receipt-title-box">Fee Settlement Receipt</span></div>
            </div>

            <div class="bill-details">
              <div class="row-item">
                <span class="row-lbl">Receipt Number:</span>
                <span class="row-val font-mono" style="font-family: 'Courier Prime', monospace; font-size: 13px;">${receipt.receiptNo}</span>
              </div>
              <div class="row-item">
                <span class="row-lbl">Payment Date:</span>
                <span class="row-val">${currentDate}</span>
              </div>
              <div class="row-item">
                <span class="row-lbl">Student Name:</span>
                <span class="row-val">${receipt.studentName}</span>
              </div>
              <div class="row-item">
                <span class="row-lbl">Admission No:</span>
                <span class="row-val font-mono">${receipt.admissionNo}</span>
              </div>
              <div class="row-item">
                <span class="row-lbl">Academic Class:</span>
                <span class="row-val">${receipt.className}${receipt.section ? `-${receipt.section}` : ''}</span>
              </div>
              ${receipt.academicYear ? `
              <div class="row-item">
                <span class="row-lbl">Academic Year:</span>
                <span class="row-val">${receipt.academicYear}</span>
              </div>
              ` : ''}
              ${receipt.month ? `
              <div class="row-item">
                <span class="row-lbl">Installment Month:</span>
                <span class="row-val">${receipt.month}</span>
              </div>
              ` : ''}
              </div>
              ${receipt.category ? `
              <div class="row-item">
                <span class="row-lbl">Category:</span>
                <span class="row-val">${receipt.category}</span>
              </div>
              ` : ''}
              ${receipt.village ? `
              <div class="row-item">
                <span class="row-lbl">Village:</span>
                <span class="row-val">${receipt.village}</span>
              </div>
              ` : ''}
              <div class="row-item">
                <span class="row-lbl">Mode of Payment:</span>
                <span class="row-val">${receipt.paymentMode}</span>
              </div>

              <div class="amount-highlight-box">
                <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Net Paid Settle</div>
                <div class="amount-txt">₹${(receipt.amount || 0).toLocaleString()}</div>
              </div>

              ${receipt.feeSnapshot ? `
              <div class="row-item">
                <span class="row-lbl">Base Fee:</span>
                <span class="row-val">₹${(receipt.feeSnapshot.totalBeforeDiscount || 0).toLocaleString()}</span>
              </div>
              ${Array.isArray(receipt.feeSnapshot.concessions) && receipt.feeSnapshot.concessions.length > 0 ? receipt.feeSnapshot.concessions.map((concession) => `
                <div class="row-item">
                  <span class="row-lbl">${(concession?.type || 'Concession').replace(/_/g, ' ')}:</span>
                  <span class="row-val" style="color: #ef4444;">-₹${Number(concession?.amountDeducted || 0).toLocaleString()}</span>
                </div>
              `).join('') : ''}
              <div class="row-item">
                <span class="row-lbl">Total Discount:</span>
                <span class="row-val" style="color: #ef4444;">-₹${(receipt.feeSnapshot.totalDiscount || 0).toLocaleString()}</span>
              </div>
              <div class="row-item dark">
                <span class="row-lbl">Final Fee:</span>
                <span class="row-val" style="color: #10b981;">₹${(receipt.feeSnapshot.finalAmount || 0).toLocaleString()}</span>
              </div>
              ` : `
              <div class="row-item">
                <span class="row-lbl">Tuition Fees Master Total:</span>
                <span class="row-val">₹${(receipt.totalFee || 0).toLocaleString()}</span>
              </div>
              `}
              <div class="row-item">
                <span class="row-lbl">Cumulative Paid Fees:</span>
                <span class="row-val" style="color: #10b981;">₹${(receipt.paidAmountTotal || 0).toLocaleString()}</span>
              </div>
              <div class="row-item dark">
                <span class="row-lbl">Remaining Due Fees:</span>
                <span class="row-val" style="color: #ef4444;">₹${(receipt.dueAmountRemaining || 0).toLocaleString()}</span>
              </div>
            </div>

            <div class="signatures-area">
              <div class="signature-box">
                <div class="line"></div>
                <div>Authorized cashier</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div>Parent signatory</div>
              </div>
            </div>

          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
