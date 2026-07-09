import React from 'react';
import { LucideIcon } from 'lucide-react';
import Card from '../common/Card';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionText: string;
  onClick: () => void;
  accentBgClass?: string;
  accentTextClass?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  actionText,
  onClick,
  accentBgClass = 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
  accentTextClass = 'text-blue-600 hover:text-blue-700',
}) => {
  return (
    <Card 
      onClick={onClick}
      hoverEffect 
      className="group cursor-pointer select-none flex flex-col justify-between h-full hover:border-slate-300"
    >
      <div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 pointer-events-none mb-4 ${accentBgClass}`}>
          <Icon size={20} />
        </div>
        <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug group-hover:text-blue-650 transition-colors">
          {title}
        </h4>
        <p className="text-xs text-slate-505 leading-relaxed mb-4">
          {description}
        </p>
      </div>

      <div className={`text-xs font-bold flex items-center gap-1 ${accentTextClass}`}>
        <span>{actionText}</span>
        <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
    </Card>
  );
};
export default QuickActionCard;
