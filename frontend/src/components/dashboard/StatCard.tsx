import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '../common/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  growth?: number;
  growthLabel?: string;
  icon: React.ReactNode;
  iconBgClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  growth,
  growthLabel = 'vs last month',
  icon,
  iconBgClass = 'bg-blue-50 text-blue-600 border border-blue-100',
}) => {
  const isPositive = growth ? growth >= 0 : true;

  return (
    <Card hoverEffect className="relative overflow-hidden group">
      {/* Decorative card shimmer on hover */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom" />
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none select-none">
          {title}
        </span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-108 ${iconBgClass}`}>
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none font-sans">
          {value}
        </h3>
        {growth !== undefined && (
          <div className="flex items-center gap-1.5 pt-1">
            <span 
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full
                ${isPositive 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-rose-50 text-rose-700'
                }
              `}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(growth)}%
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold truncate">
              {growthLabel}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
export default StatCard;
