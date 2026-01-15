// backend/src/modules/organization-landing/templates/default.ts

const generateUUID = () => {
    // Basic UUID generator for template consistency
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const defaultLandingTemplate = {
  title: 'Welcome to Our Page',
  description: 'Your new, professionally designed landing page. Customize it in the editor!',
  published: true, // Let's make it published by default
  themeConfig: {
    primaryColor: '#3B82F6',
    fontFamily: 'Inter, sans-serif',
  },
  sections: [
    {
      id: generateUUID(),
      type: 'hero',
      settings: {
        padding: '80px 20px',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
      },
      blocks: [
        {
          id: generateUUID(),
          type: 'heading',
          content: { text: 'Your Company Name' },
          style: { fontSize: '48px', fontWeight: 'bold' },
        },
        {
          id: generateUUID(),
          type: 'paragraph',
          content: { text: 'A brief and catchy description about what you do and why it matters.' },
          style: { fontSize: '18px', color: '#4B5563', maxWidth: '600px', margin: '10px auto' },
        },
        {
          id: generateUUID(),
          type: 'button',
          content: { text: 'Contact Us', href: '#' },
          style: {
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '8px',
            marginTop: '20px',
          },
        },
      ],
    },
    {
      id: generateUUID(),
      type: 'two-column',
      settings: {
        padding: '60px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'center',
      },
      blocks: [
        {
          id: generateUUID(),
          type: 'image',
          content: { src: 'https://via.placeholder.com/500x400?text=Your+Product', alt: 'Product image' },
          style: { width: '100%', borderRadius: '8px' },
        },
        {
          id: generateUUID(),
          type: 'rich-text',
          content: { html: '<h2>About Our Product</h2><p>Explain the key benefits and features of your product here. Use this space to convince visitors of its value.</p>' },
          style: {},
        },
      ],
    }
  ],
};
