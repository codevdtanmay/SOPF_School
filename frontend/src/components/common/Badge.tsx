import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate' | 'info';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full tracking-wider uppercase';
  
  const variants = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/50',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/50',
    slate: 'bg-slate-50 text-slate-600 border border-slate-200/50',
    info: 'bg-indigo-50 text-indigo-700 border border-indigo-200/50',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
