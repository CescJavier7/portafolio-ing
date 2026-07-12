import React from 'react';

interface BrandLogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const BrandLogo = ({ 
  size = 20, 
  color = "#007AFF", 
  strokeWidth = 2.5 
}: BrandLogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);