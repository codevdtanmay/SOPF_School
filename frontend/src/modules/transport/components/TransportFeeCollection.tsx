import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader as LoaderIcon } from 'lucide-react';

import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import { Transport } from '../types/transport.types';
import { TransportFeePayment } from '../../../api/transportFeeApi';

interface Props {
  loading: boolean;
  transports: Transport[];
  payments: TransportFeePayment[];
  onCollectFee?: (transport: Transport, month: string, year: string, amountToCollect?: number) => void;
}

const monthsList = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];
const getCurrentCalendarMonth = () => monthsList[new Date().getMonth()];
const getCurrentCalendarYear = () => String(new Date().getFullYear());

const TransportFeeCollection: React.FC<Props> = ({ loading, transports, payments, onCollectFee }) => {
  const [colSearchQuery, setColSearchQuery] = useState('');
  const [colRouteFilter, setColRouteFilter] = useState('All');
  const [colClassFilter, setColClassFilter] = useState('All');
  const [colStatusFilter, setColStatusFilter] = useState('All');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(getCurrentCalendarMonth);
  const [currentCalendarYear, setCurrentCalendarYear] = useState(getCurrentCalendarYear);
  const previousCalendarRef = useRef({ month: currentCalendarMonth, year: currentCalendarYear });
  const [colMonthFilter, setColMonthFilter] = useState(currentCalendarMonth);
  const [colYearFilter, setColYearFilter] = useState(currentCalendarYear);

  const [colPage, setColPage] = useState(1);
  const [colLimit, setColLimit] = useState(10);

  const classesList = useMemo(() => Array.from(new Set(transports.map(t => t.className).filter(Boolean))).sort(), [transports]);
  const standardRoutes = useMemo(() => Array.from(new Set(transports.map(t => t.routeName).filter(Boolean))).sort(), [transports]);
  const yearsList = useMemo(() => {
    const y = Number(currentCalendarYear);
    const maxYear = 2035;
    const startYear = Math.max(1, y - 1);
    return Array.from({ length: maxYear - startYear + 1 }, (_, index) => String(startYear + index));
  }, [currentCalendarYear]);

  useEffect(() => {
    const syncCalendarFilters = () => {
      const nextMonth = getCurrentCalendarMonth();
      const nextYear = getCurrentCalendarYear();
      const previous = previousCalendarRef.current;

      setCurrentCalendarMonth(nextMonth);
      setCurrentCalendarYear(nextYear);

      setColMonthFilter((current) => (current === previous.month ? nextMonth : current));
      setColYearFilter((current) => (current === previous.year ? nextYear : current));

      previousCalendarRef.current = { month: nextMonth, year: nextYear };
    };

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
      0
    );
    const timeout = window.setTimeout(syncCalendarFilters, nextMidnight.getTime() - now.getTime());

    return () => window.clearTimeout(timeout);
  }, [currentCalendarMonth, currentCalendarYear]);

  const feeCollectionRoster = useMemo(() => {
    const active = transports.filter(t => t.status === 'Active');

    return active.map(t => {
      const payment = payments.find(
        p =>
          p.studentId === t.studentId &&
          p.month === colMonthFilter &&
          p.year === colYearFilter
      );

      const latest = payments
        .filter(p => p.studentId === t.studentId)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )[0];

      const status = payment?.status ?? "Pending";
      const amountToCollect =
        status === "Partial" && payment
          ? Number(payment.dueAmount || Math.max(0, payment.amount - payment.paidAmount))
          : t.monthlyCharge;

      return {
        transport: t,
        status,
        lastPaidMonth: latest ? `${latest.month} ${latest.year}` : "—",
        amountToCollect
      };
    }).filter(row => {
      const t = row.transport;
      const q = colSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.admissionNo.toLowerCase().includes(q);
      const matchesRoute = colRouteFilter === 'All' || t.routeName === colRouteFilter;
      const matchesClass = colClassFilter === 'All' || t.className === colClassFilter;
      const matchesStatus = colStatusFilter === 'All' || row.status === colStatusFilter;
      return matchesSearch && matchesRoute && matchesClass && matchesStatus;
    });
  }, [
    transports,
    payments,
    colSearchQuery,
    colRouteFilter,
    colClassFilter,
    colStatusFilter,
    colMonthFilter,
    colYearFilter
  ]);

  const paginatedFeeRoster = useMemo(() => {
    const start = (colPage - 1) * colLimit;
    return feeCollectionRoster.slice(start, start + colLimit);
  }, [feeCollectionRoster, colPage, colLimit]);

  const resetFilters = () => {
    setColSearchQuery('');
    setColRouteFilter('All');
    setColClassFilter('All');
    setColStatusFilter('All');
    setColMonthFilter(currentCalendarMonth);
    setColYearFilter(currentCalendarYear);
    setColPage(1);
  };

  const handleOpenCollectFee = (
    transport: Transport,
    month?: string,
    year?: string,
    amountToCollect?: number
  ) => {
    onCollectFee?.(transport, month || colMonthFilter, year || colYearFilter, amountToCollect);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex flex-col gap-4 shadow-sm select-none">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none"><Search size={14} /></span>
            <input type="text" value={colSearchQuery} onChange={(e) => setColSearchQuery(e.target.value)} placeholder="Search student Name, Admission No..." className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Route:</span>
            <select value={colRouteFilter} onChange={(e) => setColRouteFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Routes</option>
              {standardRoutes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Class:</span>
            <select value={colClassFilter} onChange={(e) => setColClassFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Classes</option>
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status:</span>
            <select value={colStatusFilter} onChange={(e) => setColStatusFilter(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none">
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          <div className="flex justify-end items-center">
            <Button onClick={resetFilters} variant="outline" size="sm" className="w-full text-slate-750 font-bold">Reset Filters</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100">
          <span className="text-xs font-black text-slate-800 tracking-wide">Target Billing Period:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Month</span>
            <select value={colMonthFilter} onChange={(e) => setColMonthFilter(e.target.value)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border-none rounded text-xs font-black cursor-pointer outline-none">{monthsList.map(m => <option key={m} value={m}>{m}</option>)}</select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Year</span>
            <select value={colYearFilter} onChange={(e) => setColYearFilter(e.target.value)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border-none rounded text-xs font-black cursor-pointer outline-none">{yearsList.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          <span className="text-[10px] font-bold text-slate-400 ml-auto">* Collection and status indicators are compiled dynamically for <strong className="text-blue-600">{colMonthFilter} {colYearFilter}</strong>.</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Route</th>
                <th className="p-4 text-right">Monthly Charge</th>
                <th className="p-4 text-center">Last Paid Month</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-xs font-bold text-slate-400"><LoaderIcon className="animate-spin inline-block mr-2 text-blue-500" size={16} /> Loading Collection ledgers...</td>
                </tr>
              ) : feeCollectionRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-xs font-bold text-slate-400">No active commuters found matching selection query.</td>
                </tr>
              ) : (
                paginatedFeeRoster.map(row => {
                  const t = row.transport;
                  const isCurrentMonthPaid = row.status === 'Paid' && row.lastPaidMonth === `${colMonthFilter} ${colYearFilter}`;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div>
                          <div className="font-extrabold text-slate-800">{t.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Adm: {t.admissionNo}</div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-550">{t.className}</td>
                      <td className="p-4 text-slate-600 font-medium">{t.routeName}</td>
                      <td className="p-4 text-right font-black text-slate-800">₹{t.monthlyCharge}</td>
                      <td className="p-4 text-center font-bold text-slate-500">{row.lastPaidMonth}</td>
                      <td className="p-4 text-center">
                        {row.status === 'Paid' ? (
                          isCurrentMonthPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              Current Month Paid
                            </span>
                          ) : (
                            <Badge variant="success">Paid</Badge>
                          )
                        ) : row.status === 'Partial' ? (
                          <Badge variant="warning">Partial</Badge>
                        ) : (
                          <Badge variant="danger">Pending</Badge>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.status === 'Paid' ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            Receipt Raised
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenCollectFee(t, colMonthFilter, colYearFilter, row.amountToCollect)}
                            className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer active:scale-[0.97]"
                          >
                            {row.status === 'Partial' ? 'Pay Remaining' : 'Collect Fee'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {feeCollectionRoster.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between select-none">
            <div className="text-xs text-slate-500 font-semibold">Showing <span className="font-bold text-slate-700">{Math.min(feeCollectionRoster.length, (colPage - 1) * colLimit + 1)}</span> to <span className="font-bold text-slate-700">{Math.min(feeCollectionRoster.length, colPage * colLimit)}</span> of <span className="font-bold text-slate-700">{feeCollectionRoster.length}</span> students</div>
            <div className="flex items-center gap-1">
              <select value={colLimit} onChange={(e) => { setColLimit(Number(e.target.value)); setColPage(1); }} className="px-2 py-1 border border-slate-200 hover:border-slate-300 rounded text-xs font-bold text-slate-600 cursor-pointer">{[10,20,50,100].map(l => <option key={l} value={l}>{l} per page</option>)}</select>
              <Button variant="outline" size="xs" onClick={() => setColPage(p => Math.max(1, p - 1))} disabled={colPage === 1}>Previous</Button>
              <Button variant="outline" size="xs" onClick={() => setColPage(p => Math.min(Math.ceil(feeCollectionRoster.length / colLimit), p + 1))} disabled={colPage * colLimit >= feeCollectionRoster.length}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportFeeCollection;
