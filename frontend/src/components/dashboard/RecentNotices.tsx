import React from 'react';
import { Megaphone, Calendar, User, CornerDownRight } from 'lucide-react';
import { Notice } from '../../types';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { formatDate } from '../../utils/dateFormatter';

interface RecentNoticesProps {
  notices: Notice[];
  loading?: boolean;
}

export const RecentNotices: React.FC<RecentNoticesProps> = ({ notices, loading = false }) => {
  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'primary';
      default: return 'slate';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 select-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Megaphone size={14} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Recent Announcements
          </h3>
        </div>
        <Badge variant="primary" size="sm">
          Active
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 py-1">
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-3 w-5/6 bg-slate-200 rounded" />
              <div className="h-3.5 w-1/4 bg-slate-200 rounded" />
            </div>
          ))
        ) : notices.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No active notices recorded on board.
          </div>
        ) : (
          notices.map((notice) => (
            <div 
              key={notice.id} 
              className="group p-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white rounded-xl transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                  {notice.title}
                </span>
                <Badge variant={getPriorityVariant(notice.priority)} size="sm">
                  {notice.priority}
                </Badge>
              </div>
              
              <p className="text-xs text-slate-505 leading-relaxed mb-3">
                {notice.content}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{formatDate(notice.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={11} />
                  <span>{notice.publishedBy}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
export default RecentNotices;
