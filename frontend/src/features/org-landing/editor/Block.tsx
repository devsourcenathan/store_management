import React from 'react';
import { StyleProperties } from '@/types/landing';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BlockProps {
  id: string;
  type: string;
  content: Record<string, any>;
  style: StyleProperties;
  onClick: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

export const Block: React.FC<BlockProps> = ({ id, type, content, style, onClick, onDelete }) => {
  return (
    <div
      className="bg-white border rounded p-4 mb-2 relative group"
      onClick={onClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>

      <div>
        <p className="font-medium text-sm text-gray-500 uppercase">{type}</p>
        <div style={style} className="block-content">
          {/* A simple preview based on type */}
          {type === 'heading' && <h1>{content.text}</h1>}
          {type === 'paragraph' && <p>{content.text}</p>}
          {type === 'image' && <img src={content.src} alt={content.alt || ''} className="max-w-full h-auto" />}
          {type === 'button' && <Button style={style}>{content.text}</Button>}
          {type === 'rich-text' && <div dangerouslySetInnerHTML={{ __html: content.html }} />}
        </div>
      </div>
    </div>
  );
};
