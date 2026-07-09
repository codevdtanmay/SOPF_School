import React from 'react';
import { Activity as SystemActivity } from '../../types';
import { UserPlus, Megaphone, DollarSign, UserCheck, CalendarDays, Activity } from 'lucide-react';
import Card from '../common/Card';
import { formatDate } from '../../utils/dateFormatter';

interface RecentActivitiesProps {
  activities: SystemActivity[];
  loading?: boolean;
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities, loading = false }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'student':
        return {
          icon: <UserPlus size={14} />,
          bg: 'bg-indigo-50 border border-indigo-100 text-indigo-600'
        };
      case 'teacher':
        return {
          icon: <UserCheck size={14} />,
          bg: 'bg-sky-50 border border-sky-100 text-sky-600'
        };
      case 'fee':
        return {
          icon: <DollarSign size={14} />,
          bg: 'bg-emerald-50 border border-emerald-100 text-emerald-600'
        };
      case 'notice':
        return {
          icon: <Megaphone size={14} />,
          bg: 'bg-amber-50 border border-amber-100 text-amber-600'
        };
      default:
        return {
          icon: <Activity size={14} />,
          bg: 'bg-slate-50 border border-slate-100 text-slate-600'
        };
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 select-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarDays size={14} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            System Activities Log
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 pb-5 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="space-y-2 flex-grow">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/4 bg-slate-200 rounded" />
              </div>
            </div>
          ))
        ) : (Array.isArray(activities) ? activities : []).length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No system actions logged.
          </div>
        ) : (
          <div className="relative border-l border-slate-100 pl-4 ml-4 py-2 space-y-6">
            {(Array.isArray(activities) ? activities : []).map((act) => {
              const meta = getActivityIcon(act.type);
              return (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet handle */}
                  <span className={`absolute -left-8 top-0.5 h-8 w-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110 z-10 ${meta.bg}`}>
                    {meta.icon}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-normal group-hover:text-blue-600 transition-colors">
                      {act.activity}
                    </p>
                    <div className="flex items-center gap-2 mt-1 first-letter:capitalize">
                      <span className="text-[10px] text-slate-400 font-bold">
                        Role: {act.user}
                      </span>
                      <span className="h-1 w-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">
                        {formatDate(act.time)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
export default RecentActivities;
