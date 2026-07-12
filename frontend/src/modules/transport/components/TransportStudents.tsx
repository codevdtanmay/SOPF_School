import React, { useMemo, useState } from 'react';
import { Search, Plus, Route as RouteIcon, Edit2, Trash2, Loader as LoaderIcon } from 'lucide-react';

import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import { Transport } from '../types/transport.types';

interface Props {
  loading: boolean;
  transports: Transport[];
  onAddStudent?: () => void;
  onEditStudent?: (transport: Transport) => void;
  onDeleteStudent?: (transport: Transport) => void;
  onCollectFee?: (transport: Transport) => void;
  onSelectStudent?: (transport: Transport) => void;
}

const TransportStudents: React.FC<Props> = ({
  loading,
  transports,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onCollectFee,
  onSelectStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [routeFilter, setRouteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [studPage, setStudPage] = useState(1);
  const [studLimit, setStudLimit] = useState(10);

  const classesList = useMemo(() => {
    return Array.from(new Set(transports.map((t) => t.className).filter(Boolean))).sort();
  }, [transports]);

  const standardRoutes = useMemo(() => {
    return Array.from(new Set(transports.map((t) => t.routeName).filter(Boolean))).sort();
  }, [transports]);

  const filteredTransports = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return transports.filter((t) => {
      const matchesSearch =
        !normalizedSearch ||
        t.name.toLowerCase().includes(normalizedSearch) ||
        t.admissionNo.toLowerCase().includes(normalizedSearch) ||
        t.routeName.toLowerCase().includes(normalizedSearch) ||
        t.pickupPoint.toLowerCase().includes(normalizedSearch);

      const matchesClass = classFilter === 'All' || t.className === classFilter;
      const matchesRoute = routeFilter === 'All' || t.routeName === routeFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

      return matchesSearch && matchesClass && matchesRoute && matchesStatus;
    });
  }, [transports, searchQuery, classFilter, routeFilter, statusFilter]);

  const paginatedTransports = useMemo(() => {
    const start = (studPage - 1) * studLimit;
    return filteredTransports.slice(start, start + studLimit);
  }, [filteredTransports, studPage, studLimit]);

  const handleSelectRow = (transport: Transport) => {
    setSelectedTransport(transport);
    onSelectStudent?.(transport);
  };

  const handleAddStudent = () => {
    onAddStudent?.();
  };

  const handleEditClick = (transport: Transport, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEditStudent?.(transport);
  };

  const handleDeleteClick = (transport: Transport, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDeleteStudent?.(transport);
  };

  const handleOpenCollectFee = (transport: Transport) => {
    onCollectFee?.(transport);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setClassFilter('All');
    setRouteFilter('All');
    setStatusFilter('All');
    setStudPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm select-none">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Student name, Admission No, Route..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[90px]"
            >
              <option value="All">All Grades</option>
              {classesList.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Route:</span>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[90px]"
            >
              <option value="All">All Routes</option>
              {standardRoutes.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-500 cursor-pointer outline-none min-w-[95px]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button onClick={resetFilters} variant="outline" size="xs" className="text-slate-600">
              Reset
            </Button>
            <Button onClick={handleAddStudent} size="xs" leftIcon={<Plus size={13} />}>
              Add Student
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                <th className="p-4">Student Name</th>
                <th className="p-4">Admission No</th>
                <th className="p-4">Class</th>
                <th className="p-4">Route</th>
                <th className="p-4">Pickup Point</th>
                <th className="p-4 text-right">Monthly Charge</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-xs font-bold text-slate-400">
                    <LoaderIcon className="animate-spin inline-block mr-2 text-blue-500" size={16} /> Loading Transport Roster...
                  </td>
                </tr>
              ) : filteredTransports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-xs font-bold text-slate-500">
                    No students are currently matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedTransports.map((t) => {
                  const isSelected = selectedTransport?.id === t.id;
                  const isCurrentMonthPaid =
                    t.paymentStatus === 'Paid' || (t.dueAmount != null && t.dueAmount <= 0);
                  const isCurrentMonthPartial =
                    !isCurrentMonthPaid && t.paymentStatus === 'Partial';
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectRow(t)}
                      className={`group hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/20' : ''}`}
                    >
                      <td className="p-4 font-bold text-slate-800">{t.name}</td>
                      <td className="p-4 font-mono text-slate-500 font-semibold">{t.admissionNo}</td>
                      <td className="p-4 font-semibold text-slate-600">{t.className}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-750 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          <RouteIcon size={10} />
                          {t.routeName}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{t.pickupPoint}</td>
                      <td className="p-4 text-right font-black text-slate-800">₹{t.monthlyCharge}</td>
                      <td className="p-4 text-center">
                        <Badge variant={t.status === 'Active' ? 'success' : 'slate'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {t.status === 'Active' && isCurrentMonthPaid ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              Current Month Paid
                            </span>
                          ) : t.status === 'Active' && (
                            <button
                              onClick={() => handleOpenCollectFee(t)}
                              className="text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md transition-all shadow-sm cursor-pointer"
                            >
                              {isCurrentMonthPartial ? 'Pay Remaining' : 'Collect Fee'}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleEditClick(t, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(t, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredTransports.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between select-none">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <span className="font-bold text-slate-700">{Math.min(filteredTransports.length, (studPage - 1) * studLimit + 1)}</span> to{' '}
              <span className="font-bold text-slate-700">{Math.min(filteredTransports.length, studPage * studLimit)}</span> of{' '}
              <span className="font-bold text-slate-700">{filteredTransports.length}</span> students
            </div>
            <div className="flex items-center gap-1">
              <select
                value={studLimit}
                onChange={(e) => {
                  setStudLimit(Number(e.target.value));
                  setStudPage(1);
                }}
                className="px-2 py-1 border border-slate-200 hover:border-slate-300 rounded text-xs font-bold text-slate-600 cursor-pointer"
              >
                {[10, 20, 50, 100].map((lim) => (
                  <option key={lim} value={lim}>{lim} per page</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setStudPage((p) => Math.max(1, p - 1))}
                disabled={studPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setStudPage((p) => Math.min(Math.ceil(filteredTransports.length / studLimit), p + 1))}
                disabled={studPage * studLimit >= filteredTransports.length}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportStudents;
