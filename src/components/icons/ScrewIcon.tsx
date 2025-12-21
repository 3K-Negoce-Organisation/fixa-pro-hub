import React from 'react';

interface ScrewIconProps {
  className?: string;
  size?: number;
}

const ScrewIcon: React.FC<ScrewIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tête de vis (vue de dessus avec fente cruciforme) */}
      <circle
        cx="12"
        cy="5"
        r="4"
        fill="currentColor"
        opacity="0.9"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="8"
        stroke="hsl(var(--background))"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="5"
        x2="15"
        y2="5"
        stroke="hsl(var(--background))"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Corps de la vis */}
      <rect
        x="10"
        y="9"
        width="4"
        height="8"
        fill="currentColor"
        opacity="0.85"
      />
      
      {/* Filetage */}
      <path
        d="M10 11 L8 12 M14 11 L16 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 13.5 L7.5 14.5 M14 13.5 L16.5 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 16 L8 17 M14 16 L16 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Pointe */}
      <path
        d="M10 17 L12 22 L14 17"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
};

export default ScrewIcon;
