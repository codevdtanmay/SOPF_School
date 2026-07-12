import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 tracking-wide select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 flex items-center justify-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 border rounded-lg transition-all duration-200 outline-none ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error ? (
        <span className="text-xs text-red-500 font-medium flex items-center gap-1">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-400 leading-normal font-normal">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
export default Input;
