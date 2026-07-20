import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { studentApi } from '../../api/studentApi';

type FeePreviewConcession = {
  type?: string;
  discountType?: string;
  value?: number;
  amountDeducted?: number;
};

type FeePreviewResponse = {
  academicYear?: string;
  admissionType?: 'new' | 'old';
  feeSnapshot?: {
    totalBeforeDiscount?: number;
    totalDiscount?: number;
    finalAmount?: number;
    concessions?: FeePreviewConcession[];
    concessionsApplied?: FeePreviewConcession[];
    feeStructureSnapshot?: Record<string, unknown>;
  };
  totalBeforeDiscount?: number;
  totalDiscount?: number;
  finalAmount?: number;
  concessions?: FeePreviewConcession[];
  concessionsApplied?: FeePreviewConcession[];
};

interface FeeSummaryProps {
  studentId?: string | null;
  academicYearId?: string | null;
  compact?: boolean;
  className?: string;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatConcessionLabel = (concession: FeePreviewConcession) => {
  const type = String(concession.type || '').toUpperCase();
  const percent = Number(concession.value);

  switch (type) {
    case 'RTE':
      return 'RTE concession';
    case 'SIBLING':
      return Number.isFinite(percent) ? `Sibling discount (${percent}%)` : 'Sibling discount';
    case 'STAFF_WARD':
      return 'Staff ward concession';
    case 'SCHOLARSHIP':
      return 'Scholarship';
    default:
      return type ? `${type.charAt(0)}${type.slice(1).toLowerCase()} concession` : 'Concession';
  }
};

export const FeeSummary: React.FC<FeeSummaryProps> = ({
  studentId,
  academicYearId,
  compact = false,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<FeePreviewResponse | null>(null);

  useEffect(() => {
    if (!studentId || !academicYearId) {
      setPreview(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await studentApi.getFeePreview(studentId, academicYearId);
        if (!cancelled) {
          setPreview(response || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Unable to load fee preview');
          setPreview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [studentId, academicYearId]);

  const snapshot = preview?.feeSnapshot || preview;
  const concessions = useMemo(
    () => snapshot?.concessions || snapshot?.concessionsApplied || preview?.concessions || preview?.concessionsApplied || [],
    [preview, snapshot]
  );
  const totalBeforeDiscount = Number(snapshot?.totalBeforeDiscount ?? preview?.totalBeforeDiscount ?? 0);
  const totalDiscount = Number(snapshot?.totalDiscount ?? preview?.totalDiscount ?? 0);
  const finalAmount = Number(snapshot?.finalAmount ?? preview?.finalAmount ?? 0);
  const academicYearLabel = preview?.academicYear || academicYearId || '';
  const admissionType = preview?.admissionType || snapshot?.admissionType || 'new';
  const hasData = Boolean(studentId && academicYearId);

  if (!hasData) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500 ${className}`}>
        Select a student and academic year to preview the fee summary.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 space-y-3 ${className}`}>
        <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-start gap-2 ${className}`}>
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fee summary</p>
          <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{academicYearLabel || 'Academic Year'}</h4>
        </div>
        {compact ? null : (
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
            Preview <ChevronRight size={12} />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 font-semibold">Base fee</span>
          <span className="font-black text-slate-900">{money(totalBeforeDiscount)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 font-semibold">Admission type</span>
          <span className="font-bold text-slate-800">
            {admissionType === 'old' ? 'Old (no admission fee)' : 'New'}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Concessions</div>
          {concessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              No concessions applied.
            </div>
          ) : (
            concessions.map((concession: FeePreviewConcession, index: number) => (
              <div key={`${concession.type || 'c'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{formatConcessionLabel(concession)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {String(concession.discountType || '').replace(/_/g, ' ')}
                  </p>
                </div>
                <span className="font-black text-rose-600 whitespace-nowrap">
                  -{money(Number(concession.amountDeducted || 0))}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <span className="text-slate-500 font-semibold">Total discount</span>
          <span className="font-black text-rose-600">-{money(totalDiscount)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
          <span className="text-emerald-700 font-extrabold">Final fee</span>
          <span className="font-black text-emerald-700 text-base">{money(finalAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default FeeSummary;
