// frontend/src/features/org-landing/editor/page-templates.ts
import { OrganizationLandingData } from '@/types/landing';
import { v4 as uuidv4 } from 'uuid';

type PageTemplate = Omit<OrganizationLandingData, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'organization'>;

const generateUUIDs = (sections: any[]) => {
  return sections.map(section => ({
    ...section,
    id: uuidv4(),
    blocks: section.blocks.map((block: any) => ({
      ...block,
      id: uuidv4(),
    })),
  }));
};

const modernSaaSTemplate: PageTemplate = {
  title: 'Modern SaaS Solution',
  description: 'The best solution for your business needs. Scalable, reliable, and affordable.',
  subdomain: '',
  customDomain: '',
  published: false,
  themeConfig: {
    primaryColor: '#10B981', // Emerald
    fontFamily: 'Inter, sans-serif',
  },
  sections: generateUUIDs([
    {
      type: 'hero',
      settings: { padding: '96px 20px', textAlign: 'center', backgroundColor: '#FFFFFF' },
      blocks: [
        { type: 'heading', content: { text: 'The Future of SaaS is Here' }, style: { fontSize: '52px', fontWeight: 'bold' } },
        { type: 'paragraph', content: { text: 'We provide innovative solutions to scale your business.' }, style: { fontSize: '20px', color: '#6B7280', maxWidth: '700px', margin: '1rem auto' } },
        { type: 'button', content: { text: 'Get Started Free', href: '#' }, style: { backgroundColor: '#10B981', color: '#FFFFFF', padding: '14px 28px', borderRadius: '8px', marginTop: '24px' } },
      ],
    },
    {
        type: 'two-column',
        settings: { padding: '60px 20px', gap: '40px', alignItems: 'center' },
        blocks: [
          { type: 'image', content: { src: 'https://via.placeholder.com/500x400?text=App+Screenshot', alt: 'App screenshot' } },
          { type: 'rich-text', content: { html: '<h2>Powerful Features</h2><p>Our platform comes with a variety of powerful features to help you manage your business more efficiently.</p>' } },
        ],
      },
  ]),
};

const creativePortfolioTemplate: PageTemplate = {
    title: 'Creative Portfolio',
    description: 'A collection of my best work.',
    subdomain: '',
    customDomain: '',
    published: false,
    themeConfig: {
      primaryColor: '#EC4899', // Pink
      fontFamily: '"DM Sans", sans-serif',
    },
    sections: generateUUIDs([
      {
        type: 'hero',
        settings: { padding: '80px 20px', textAlign: 'center', backgroundColor: '#111827' }, // Dark background
        blocks: [
          { type: 'heading', content: { text: 'John Doe - Creative Designer' }, style: { fontSize: '48px', fontWeight: 'bold', color: '#FFFFFF' } },
          { type: 'paragraph', content: { text: 'I design and build beautiful websites.' }, style: { fontSize: '20px', color: '#D1D5DB' } },
        ],
      },
      {
        type: 'three-column', // Assuming a three-column section type exists or can be styled
        settings: { padding: '60px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
        blocks: [
          { type: 'image', content: { src: 'https://via.placeholder.com/400x300?text=Project+1', alt: 'Project 1' } },
          { type: 'image', content: { src: 'https://via.placeholder.com/400x300?text=Project+2', alt: 'Project 2' } },
          { type: 'image', content: { src: 'https://via.placeholder.com/400x300?text=Project+3', alt: 'Project 3' } },
        ],
      },
    ]),
  };
  
const simpleEcommerceTemplate: PageTemplate = {
    title: 'Simple E-commerce Store',
    description: 'Your one-stop shop for amazing products.',
    subdomain: '',
    customDomain: '',
    published: false,
    themeConfig: {
      primaryColor: '#8B5CF6', // Violet
      fontFamily: 'Lato, sans-serif',
    },
    sections: generateUUIDs([
        {
            type: 'full-width',
            settings: { padding: '60px 20px', textAlign: 'center' },
            blocks: [
                { type: 'heading', content: { text: 'Featured Product' }, style: { fontSize: '40px', fontWeight: 'bold' } },
            ],
        },
      {
        type: 'two-column',
        settings: { padding: '40px 20px', gap: '40px', alignItems: 'center' },
        blocks: [
          { type: 'image', content: { src: 'https://via.placeholder.com/500x500?text=Product+Image', alt: 'Featured product' } },
          {
            type: 'rich-text',
            content: { html: '<h2>Amazing Gadget</h2><p>This gadget will change your life. High quality and great price.</p><h3>$99.99</h3>' },
          },
        ],
      },
      {
        type: 'full-width',
        settings: { padding: '40px 20px', textAlign: 'center' },
        blocks: [
            { type: 'button', content: { text: 'Buy Now', href: '#' }, style: { backgroundColor: '#8B5CF6', color: '#FFFFFF', padding: '14px 28px', borderRadius: '8px' } },
        ],
      },
    ]),
  };

export const pageTemplates = {
    'modern-saas': modernSaaSTemplate,
    'creative-portfolio': creativePortfolioTemplate,
    'simple-ecommerce': simpleEcommerceTemplate,
};

export const availablePageTemplates = Object.keys(pageTemplates);
