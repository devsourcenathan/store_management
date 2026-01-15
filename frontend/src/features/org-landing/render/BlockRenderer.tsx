// frontend/src/features/org-landing/render/BlockRenderer.tsx
import React from 'react';
import { Block } from '@/types/landing';

interface BlockRendererProps {
  block: Block;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block }) => {
  const { type, content, style } = block;

  const getStyle = () => {
    return style || {};
  };

  switch (type) {
    case 'heading':
      const level = content.level || 'h1';
      const HeadingTag = level as keyof JSX.IntrinsicElements;
      return <HeadingTag style={getStyle()}>{content.text}</HeadingTag>;
    case 'paragraph':
      return <p style={getStyle()}>{content.text}</p>;
    case 'image':
      return <img src={content.src} alt={content.alt || ''} style={getStyle()} />;
    case 'button':
      return (
        <button
          style={getStyle()}
          className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors" // Basic styling, can be customized
          onClick={() => content.href && window.open(content.href, '_blank')}
        >
          {content.text}
        </button>
      );
    case 'rich-text':
      return <div style={getStyle()} dangerouslySetInnerHTML={{ __html: content.html }} />;
    default:
      return <div className="text-red-500">Unsupported block type: {type}</div>;
  }
};
