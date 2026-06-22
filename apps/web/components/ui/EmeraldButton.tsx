import React from 'react';

interface EmeraldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function EmeraldButton({ children, className = '', variant = 'primary', ...props }: EmeraldButtonProps) {
  let variantClasses = '';
  
  switch (variant) {
    case 'primary':
      variantClasses = 'btn-emerald';
      break;
    case 'secondary':
      variantClasses = 'bg-graphite-800 text-white border border-graphite-600 hover:bg-graphite-700 active:bg-graphite-900';
      break;
    case 'outline':
      variantClasses = 'bg-transparent text-emerald-500 border border-emerald-500/50 hover:bg-emerald-500/10 active:bg-emerald-500/20';
      break;
  }

  return (
    <button className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
