import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl p-5 md:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03),_0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300
        ${hoverEffect ? 'hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:border-slate-300/80 hover:-translate-y-0.5' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
