// frontend/src/features/org-landing/editor/presets.ts
import { Section, Block } from '@/types/landing';
import { v4 as uuidv4 } from 'uuid';

// --- Block Presets ---
const createBlockInstance = (blockPreset: Omit<Block, 'id'>): Block => {
  return {
    ...blockPreset,
    id: uuidv4(),
  };
};

const headingBlockPreset: Omit<Block, 'id'> = {
  type: 'heading',
  content: { text: 'New Heading' },
  style: { fontSize: '24px', fontWeight: 'bold' },
};

const paragraphBlockPreset: Omit<Block, 'id'> = {
  type: 'paragraph',
  content: { text: 'This is a new paragraph. You can edit this text.' },
  style: { fontSize: '16px' },
};

const imageBlockPreset: Omit<Block, 'id'> = {
  type: 'image',
  content: { src: 'https://via.placeholder.com/400x200?text=New+Image', alt: 'New image' },
  style: { width: '100%' },
};

const buttonBlockPreset: Omit<Block, 'id'> = {
  type: 'button',
  content: { text: 'Click Me', href: '#' },
  style: { 
    backgroundColor: 'var(--primary-color, #3B82F6)', 
    color: '#FFFFFF', 
    padding: '10px 20px', 
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
  },
};

const richTextBlockPreset: Omit<Block, 'id'> = {
  type: 'rich-text',
  content: { html: '<p>This is a rich text block. <strong>Edit me!</strong></p>' },
  style: {},
};

export const blockPresets = {
  heading: () => createBlockInstance(headingBlockPreset),
  paragraph: () => createBlockInstance(paragraphBlockPreset),
  image: () => createBlockInstance(imageBlockPreset),
  button: () => createBlockInstance(buttonBlockPreset),
  'rich-text': () => createBlockInstance(richTextBlockPreset),
};

export const availableBlockPresets = Object.keys(blockPresets);

// --- Section Presets ---
// A function to create a deep copy and assign new UUIDs to sections and blocks
const createPresetInstance = (sectionPreset: Omit<Section, 'id'>): Section => {
  return {
    ...sectionPreset,
    id: uuidv4(),
    blocks: sectionPreset.blocks.map(blockPreset => {
      const blockType = blockPreset.type as keyof typeof blockPresets;
      // If a full block preset is not defined, just assign a new ID
      if (!blockPresets[blockType]) {
        return { ...blockPreset, id: uuidv4() };
      }
      // Otherwise, create a new instance from the block preset
      return createBlockInstance(blockPresets[blockType]());
    }),
  };
};

const heroPreset: Omit<Section, 'id'> = {
  type: 'hero',
  settings: {
    padding: '80px 20px',
    textAlign: 'center',
    backgroundColor: '#F3F4F6', // gray-100
  },
  blocks: [
    { ...headingBlockPreset, id: '', content: { text: 'Hero Title: Welcome to Our Page' }, style: { fontSize: '48px', fontWeight: 'bold' } },
    { ...paragraphBlockPreset, id: '', content: { text: 'A compelling description of your value proposition goes here.' }, style: { fontSize: '18px', color: '#4B5563', maxWidth: '600px', margin: '10px auto' } },
    { ...buttonBlockPreset, id: '', content: { text: 'Call to Action', href: '#' }, style: { marginTop: '20px' } },
  ] as Block[], // IDs will be generated
};

const twoColumnPreset: Omit<Section, 'id'> = {
  type: 'two-column',
  settings: {
    padding: '60px 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    alignItems: 'center',
  },
  blocks: [
    { ...imageBlockPreset, id: '' },
    { ...richTextBlockPreset, id: '' },
  ],
};

const testimonialsPreset: Omit<Section, 'id'> = {
    type: 'testimonials',
    settings: {
      padding: '80px 20px',
      backgroundColor: '#F9FAFB', // gray-50
    },
    blocks: [
      { id: '', type: 'heading', content: { text: 'What Our Customers Say' }, style: { fontSize: '36px', fontWeight: 'bold', textAlign: 'center', marginBottom: '50px' } },
      { id: '', type: 'rich-text', content: { html: '<p>"This product is amazing! It changed our workflow completely."</p><strong>- Alex Doe, CEO of TechCorp</strong>' }, style: { border: '1px solid #E5E7EB', borderRadius: '8px', padding: '20px', textAlign: 'center' } },
    ],
  };


export const sectionPresets = {
  hero: () => createPresetInstance(heroPreset),
  'two-column': () => createPresetInstance(twoColumnPreset),
  testimonials: () => createPresetInstance(testimonialsPreset),
};

export const availablePresets = Object.keys(sectionPresets);
