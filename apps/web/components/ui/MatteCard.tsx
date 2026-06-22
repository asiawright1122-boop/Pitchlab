import React from 'react';

interface MatteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowOnHover?: boolean;
}

export function MatteCard({ children, className = '', glowOnHover = false, ...props }: MatteCardProps) {
  const baseClasses = 'card-matte';
  const hoverGlow = glowOnHover ? 'hover:shadow-glow' : '';
  
  return (
    <div className={`${baseClasses} ${hoverGlow} ${className}`} {...props}>
      {children}
    </div>
  );
}
