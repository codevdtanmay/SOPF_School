import React, { useMemo, useState } from "react";
import { Search, Loader as LoaderIcon, Printer, FileSpreadsheet, ArrowUpDown } from "lucide-react";

import Button from "../../../components/common/Button";
import { TransportFeePayment } from "../../../api/transportFeeApi";
import { formatDate } from "../../../utils/dateFormatter";
import { exportToPrintablePDF } from "../../../utils/exportUtils";
import { TRANSPORT_BILLING_MONTHS } from "../utils/transportCalendar";

interface Props {
  loading: boolean;
  payments: TransportFeePayment[];
  onViewReceipt: (payment: TransportFeePayment) => void;
  onPrintReceipt: (payment: TransportFeePayment) => void;
  onSendReceiptWhatsapp: (payment: TransportFeePayment) => void;
  sendingReceiptNo?: string | null;
}
type SortField =
  | "receiptNo"
  | "studentName"
  | "routeName"
  | "month"
  | "paidAmount"
  | "date";
const monthsList = TRANSPORT_BILLING_MONTHS;

const formatClassName = (className?: string, section?: string) => {
  const cls = String(className || "").trim().replace(/-$/, "");
  const sec = String(section || "").trim();

  if (!cls) {
    return "";
  }

  return sec ? `${cls}-${sec}` : cls;
};

const TransportPaymentHistory: React.FC<Props> = ({ loading, payments, onViewReceipt, onPrintReceipt, onSendReceiptWhatsapp, sendingReceiptNo }) => {
  const [histSearchQuery, setHistSearchQuery] = useState("");
  const [histRouteFilter, setHistRouteFilter] = useState("All");
  const [histMonthFilter, setHistMonthFilter] = useState("All");
  const [histYearFilter, setHistYearFilter] = useState("All");
  const [histMethodFilter, setHistMethodFilter] = useState("All");

  const [histSortField, setHistSortField] =
  useState<SortField>("date");
  const [histSortOrder, setHistSortOrder] = useState<"asc" | "desc">("desc");

  const [histPage, setHistPage] = useState(1);
  const [histLimit, setHistLimit] = useState(10);

  const standardRoutes = useMemo(() => Array.from(new Set(payments.map(p => p.routeName).filter(Boolean))).sort(), [payments]);
  const yearsList = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => set.add(String(p.year)));
    const arr = Array.from(set).sort();
    return arr.length ? arr : [String(new Date().getFullYear())];
  }, [payments]);

  const processedPayments = useMemo(() => {
    const q = histSearchQuery.trim().toLowerCase();

    let filtered = payments.filter(p => {
      const matchesSearch = !q || p.studentName.toLowerCase().includes(q) || p.admissionNo.toLowerCase().includes(q) || String(p.receiptNo).toLowerCase().includes(q) || String(p.academicYear || '').toLowerCase().includes(q);
      const matchesRoute = histRouteFilter === 'All' || p.routeName === histRouteFilter;
      const matchesMonth = histMonthFilter === 'All' || p.month === histMonthFilter;
      const matchesYear = histYearFilter === 'All' || String(p.year) === histYearFilter;
      const matchesMethod = histMethodFilter === 'All' || p.paymentMethod === histMethodFilter;
      return matchesSearch && matchesRoute && matchesMonth && matchesYear && matchesMethod;
    });

    filtered.sort((a, b) => {
      const field = histSortField;
      let va: any = (a as any)[field];
      let vb: any = (b as any)[field];

      // special handling for date-like field
      if (field === 'date') {
        va = new Date(a.date).getTime();
        vb = new Date(b.date).getTime();
      }

      if (va == null) va = '';
      if (vb == null) vb = '';

      if (va < vb) return histSortOrder === 'asc' ? -1 : 1;
      if (va > vb) return histSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, histSearchQuery, histRouteFilter, histMonthFilter, histYearFilter, histMethodFilter, histSortField, histSortOrder]);

  const paginatedPayments = useMemo(() => {
    const start = (histPage - 1) * histLimit;
    return processedPayments.slice(start, start + histLimit);
  }, [processedPayments, histPage, histLimit]);

  const resetFilters = () => {
    setHistSearchQuery('');
    setHistRouteFilter('All');
    setHistMonthFilter('All');
    setHistYearFilter('All');
    setHistMethodFilter('All');
    setHistPage(1);
  };

  

  const handleExportPaymentsExcel = () => {
    const headers = ['ReceiptNo', 'StudentName', 'AdmissionNo', 'ClassName', 'RouteName', 'Month', 'Year', 'Amount', 'PaymentMethod', 'Date'];
    const rows = processedPayments.map(p => [p.receiptNo, p.studentName, p.admissionNo, formatClassName(p.className, p.section), p.routeName, p.month, p.year, p.paidAmount, p.paymentMethod, formatDate(p.date)]);
    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transport_payments_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPaymentsPDF = () => {
    exportToPrintablePDF(
      'Transport Payment History',
      ['Receipt No', 'Student Name', 'Admission No', 'Route', 'Service Month', 'Amount', 'Method', 'Payment Date'],
      processedPayments.map((payment) => [
        payment.receiptNo,
        payment.studentName,
        payment.admissionNo,
        payment.routeName,
        `${payment.month} ${payment.year}`,
        `₹${payment.paidAmount}`,
        payment.paymentMethod,
        formatDate(payment.date)
      ]),
      'transport_payment_history'
    );
  };

 

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex flex-col gap-4 shadow-sm select-none">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none"><Search size={14} /></span>
            <input type="text" value={histSearchQuery} onChange={(e) => setHistSearchQuery(e.target.value)} placeholder="Search Name, Adm, Receipt No..." className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Route:</span>
            <select value={histRouteFilter} onChange={(e) => setHistRouteFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Routes</option>
              {standardRoutes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Month:</span>
            <select value={histMonthFilter} onChange={(e) => setHistMonthFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Months</option>
              {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Method:</span>
            <select value={histMethodFilter} onChange={(e) => setHistMethodFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Methods</option>
              {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(met => <option key={met} value={met}>{met}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Year:</span>
            <select value={histYearFilter} onChange={(e) => setHistYearFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Years</option>
              {yearsList.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={resetFilters} variant="outline" size="sm" className="grow text-slate-750 font-bold">Reset</Button>
            <Button onClick={handleExportPaymentsPDF} size="sm" className="px-3" title="Export PDF / Print list"><Printer size={14} /></Button>
            <Button onClick={handleExportPaymentsExcel} variant="outline" size="sm" className="px-3" title="Export CSV"><FileSpreadsheet size={14} className="text-emerald-600" /></Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                <th className="p-4">
                  <button onClick={() => { setHistSortField('receiptNo'); setHistSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">Receipt No <ArrowUpDown size={10} /></button>
                </th>
                <th className="p-4">
                  <button onClick={() => { setHistSortField('studentName'); setHistSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">Student Name <ArrowUpDown size={10} /></button>
                </th>
                <th className="p-4">
                  <button onClick={() => { setHistSortField('routeName' ); setHistSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">Route Name <ArrowUpDown size={10} /></button>
                </th>
                <th className="p-4">
                  <button onClick={() => { setHistSortField('month' ); setHistSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">Service Month <ArrowUpDown size={10} /></button>
                </th>
                <th className="p-4 text-right">
                  <button onClick={() => { setHistSortField('paidAmount' ); setHistSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1 justify-end w-full hover:text-slate-700 cursor-pointer">Amount Paid <ArrowUpDown size={10} /></button>
                </th>
                <th className="p-4 text-center">Payment Method</th>
                <th className="p-4 text-center">Payment Date</th>
                <th className="p-4 text-center">Receipt Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-xs font-bold text-slate-400"><LoaderIcon className="animate-spin inline-block mr-2 text-blue-500" size={16} /> Loading Transaction ledger histories...</td>
                </tr>
              ) : processedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-xs font-bold text-slate-400">No transactions found matching selection criteria.</td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-blue-800">{p.receiptNo}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-extrabold text-slate-800">{p.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Adm: {p.admissionNo} • {formatClassName(p.className, p.section)}{p.academicYear ? ` • ${p.academicYear}` : ''}</div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-600">{p.routeName}</td>
                    <td className="p-4 font-bold text-slate-600">{p.month} {p.year}</td>
                    <td className="p-4 text-right font-black text-slate-800">₹{p.paidAmount}</td>
                    <td className="p-4 text-center font-bold text-slate-500"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">{p.paymentMethod}</span></td>
                    <td className="p-4 text-center text-slate-500 font-semibold">{formatDate(p.date)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onViewReceipt(p)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">View Receipt</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => onPrintReceipt(p)} className="text-[10px] font-black text-slate-600 hover:text-slate-800 cursor-pointer">Print</button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => onSendReceiptWhatsapp(p)}
                          disabled={sendingReceiptNo === p.receiptNo}
                          className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sendingReceiptNo === p.receiptNo ? 'Sending' : 'WhatsApp'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {processedPayments.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between select-none">
            <div className="text-xs text-slate-500 font-semibold">Showing <span className="font-bold text-slate-700">{Math.min(processedPayments.length, (histPage - 1) * histLimit + 1)}</span> to <span className="font-bold text-slate-700">{Math.min(processedPayments.length, histPage * histLimit)}</span> of <span className="font-bold text-slate-700">{processedPayments.length}</span> receipts</div>
            <div className="flex items-center gap-1">
              <select value={histLimit} onChange={(e) => { setHistLimit(Number(e.target.value)); setHistPage(1); }} className="px-2 py-1 border border-slate-200 hover:border-slate-300 rounded text-xs font-bold text-slate-600 cursor-pointer">{[10,20,50,100].map(lim => <option key={lim} value={lim}>{lim} per page</option>)}</select>
              <Button variant="outline" size="xs" onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1}>Previous</Button>
              <Button variant="outline" size="xs" onClick={() => setHistPage(p => Math.min(Math.ceil(processedPayments.length / histLimit), p + 1))} disabled={histPage * histLimit >= processedPayments.length}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportPaymentHistory;
