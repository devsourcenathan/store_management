// frontend/src/features/org-landing/render/SectionRenderer.tsx
import React from 'react';
import { Section } from '@/types/landing';
import { BlockRenderer } from './BlockRenderer';

interface SectionRendererProps {
  section: Section;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section }) => {
  const { type, settings, blocks } = section;

  const getSectionStyle = () => {
    // Apply section-level styles
    return settings || {};
  };

  return (
    <section className="py-16 px-6" style={getSectionStyle()}>
      <div className="max-w-4xl mx-auto space-y-4">
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
};
