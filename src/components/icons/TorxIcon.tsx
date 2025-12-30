import React from "react";

interface TorxIconProps {
  className?: string;
}

const TorxIcon: React.FC<TorxIconProps> = ({ className = "h-4 w-4" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 6-pointed star pattern for Torx */}
      <path d="M12 2 L14.5 8.5 L21 8.5 L16 13 L18 20 L12 16 L6 20 L8 13 L3 8.5 L9.5 8.5 Z" />
    </svg>
  );
};

export default TorxIcon;
