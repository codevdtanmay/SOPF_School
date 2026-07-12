import React from 'react';
import { CreditCard, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { FeeSummary } from '../../types';
import Card from '../common/Card';

interface FeeCollectionWidgetProps {
  fees: FeeSummary | null;
  loading?: boolean;
}

export const FeeCollectionWidget: React.FC<FeeCollectionWidgetProps> = ({ fees, loading = false }) => {
  if (loading || !fees) {
    return (
      <Card className="animate-pulse space-y-4">
        <div className="h-5 w-1/3 bg-slate-200 rounded" />
        <div className="h-10 bg-slate-200 rounded" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded" />
        </div>
      </Card>
    );
  }

  const collected = fees.collected || 0;
  const pending = fees.pending || 0;
  const overdue = fees.overdue || 0;
  const monthlyTarget = fees.monthlyTarget || 1; // Avoid division by zero
  const total = collected + pending + overdue;
  const collectionRate = Math.round((collected / monthlyTarget) * 100);

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 select-none">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Fee Collection Status
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
            Realtime
          </span>
        </div>

        {/* Big numbers */}
        <div className="mb-5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
            Total Funds Collected
          </span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{collected.toLocaleString()}
            </h3>
            <span className="text-xs font-semibold text-emerald-655 flex items-center">
              <TrendingUp size={12} className="mr-0.5" />
              {collectionRate}% of monthly target
            </span>
          </div>
        </div>

        {/* Custom Progress bar */}
        <div className="space-y-1 mb-6">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Collected Target Tracker</span>
            <span>{collectionRate}% reached</span>
          </div>
          <div className="h-2.5 w-full bg-slate-150 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(collectionRate, 100)}%` }} 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
            />
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block">
            Current Target: ₹{monthlyTarget.toLocaleString()} (Current Term)
          </span>
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-slate-100/85">
        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-amber-700">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-sm font-bold text-slate-800">
            ₹{pending.toLocaleString()}
          </p>
        </div>

        <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-rose-700">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
          </div>
          <p className="text-sm font-bold text-slate-800">
            ₹{overdue.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
};
export default FeeCollectionWidget;
