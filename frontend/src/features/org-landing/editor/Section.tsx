import React from 'react';
import { StyleProperties } from '@/types/landing';

interface SectionProps {
  id: string;
  type: string;
  settings?: StyleProperties;
  children?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ id, type, settings, children }) => {
  const getSectionStyle = () => {
    return settings || {};
  };

  return (
    <div
      className="bg-white border rounded shadow-sm p-6 relative group"
      style={getSectionStyle()}
    >
      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {type}
      </div>
      <h3 className="text-lg font-medium mb-4">Section: {type} (ID: {id})</h3>
      {children}
    </div>
  );
};

