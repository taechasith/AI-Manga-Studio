import React from 'react';

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1-1m6-3l-2-2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
  </svg>
);
