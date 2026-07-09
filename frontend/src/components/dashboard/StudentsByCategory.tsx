import React from 'react';
import { Layers } from 'lucide-react';
import Card from '../common/Card';
import { Student } from '../../types';

interface StudentsByCategoryProps {
  students: Student[];
  loading?: boolean;
}

export const StudentsByCategory: React.FC<StudentsByCategoryProps> = ({ students = [], loading = false }) => {
  if (loading) {
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

  // Calculate breakdown counts
  const categoryCounts = students.reduce((acc, student) => {
    const cat = student.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = [
    { name: 'General', count: categoryCounts.General || 0, color: 'bg-amber-500', text: 'text-amber-600', lightColor: 'bg-amber-50' },
    { name: 'OBC', count: categoryCounts.OBC || 0, color: 'bg-indigo-500', text: 'text-indigo-600', lightColor: 'bg-indigo-50' },
    { name: 'SC', count: categoryCounts.SC || 0, color: 'bg-teal-500', text: 'text-teal-600', lightColor: 'bg-teal-50' },
    { name: 'ST', count: categoryCounts.ST || 0, color: 'bg-rose-500', text: 'text-rose-600', lightColor: 'bg-rose-50' },
  ];

  const total = categories.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 select-none">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Students by Category
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Demographic Split
          </span>
        </div>

        {/* Visual Multi-Segment bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden mb-6">
          {categories.map((cat) => {
            const pct = (cat.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div 
                key={cat.name}
                style={{ width: `${pct}%` }}
                className={`${cat.color} h-full transition-all duration-500 first-of-type:rounded-l-full last-of-type:rounded-r-full`}
                title={`${cat.name}: ${cat.count} student(s) (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Breakdown details */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const pct = Math.round((cat.count / total) * 100);
            return (
              <div key={cat.name} className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
                  <span className="text-xs font-semibold text-slate-700">{cat.name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-800">{cat.count}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.lightColor} ${cat.text}`}>
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
        <span className="text-slate-800 font-bold">{total} Classified Units</span>
      </div>
    </Card>
  );
};

export default StudentsByCategory;
