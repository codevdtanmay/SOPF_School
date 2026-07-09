import React from 'react';
import { Layers, GraduationCap } from 'lucide-react';
import Card from '../common/Card';

interface StudentDistributionProps {
  distribution: Record<string, number> | null;
  loading?: boolean;
}

export const StudentDistribution: React.FC<StudentDistributionProps> = ({ distribution, loading = false }) => {
  if (loading || !distribution) {
    return (
      <Card className="animate-pulse space-y-4">
        <div className="h-5 w-1/3 bg-slate-200 rounded" />
        <div className="h-12 bg-slate-200 rounded" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded" />
        </div>
      </Card>
    );
  }

const colors = [
  {
    color: "bg-blue-500",
    text: "text-blue-600",
    badge: "bg-blue-100"
  },
  {
    color: "bg-emerald-500",
    text: "text-emerald-600",
    badge: "bg-emerald-100"
  },
  {
    color: "bg-amber-500",
    text: "text-amber-600",
    badge: "bg-amber-100"
  },
  {
    color: "bg-purple-500",
    text: "text-purple-600",
    badge: "bg-purple-100"
  },
  {
    color: "bg-pink-500",
    text: "text-pink-600",
    badge: "bg-pink-100"
  },
  {
    color: "bg-cyan-500",
    text: "text-cyan-600",
    badge: "bg-cyan-100"
  }
];

const levels = Object.entries(distribution).map(
  ([name, count], index) => ({
    name,
    count,
    ...colors[index % colors.length]
  })
);

  const total = levels.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <Card className="h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 select-none">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Student Level Distribution
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            June Enrollment
          </span>
        </div>

        {/* Visual Multi-Segment bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden mb-6">
          {levels.map((level) => {
            const pct = (level.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div 
                key={level.name}
                style={{ width: `${pct}%` }}
                className={`${level.color} h-full transition-all duration-500 first-of-type:rounded-l-full last-of-type:rounded-r-full`}
                title={`${level.name}: ${level.count} student(s) (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Breakdown details */}
        <div className="space-y-3">
          {levels.map((level) => {
            const pct = Math.round((level.count / total) * 100);
            return (
              <div key={level.name} className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${level.color}`} />
                  <span className="text-xs font-semibold text-slate-700">{level.name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-800">{level.count}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.lightColor} ${level.text}`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aggregate */}
      <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>Aggregate Active Roster</span>
        <span className="text-slate-800 font-bold">{total} Registered Units</span>
      </div>
    </Card>
  );
};
export default StudentDistribution;
