// frontend/src/types/landing.d.ts

export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'rich-text' | string;
export type SectionType = 'hero' | 'two-column' | 'three-column' | 'full-width' | string;

export interface StyleProperties {
  [key: string]: string | number;
}

export interface Block {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  style?: StyleProperties;
}

export interface Section {
  id: string;
  type: SectionType;
  settings?: StyleProperties; // For section-level styling like background, padding, etc.
  blocks: Block[];
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  // Add other theme-related properties
  [key: string]: any;
}

export interface OrganizationLandingData {
  title: string;
  description: string;
  themeConfig: ThemeConfig;
  sections: Section[];
  organization: {
    name: string;
    // Add other organization properties if needed
  };
  // Add other top-level landing page properties
  [key: string]: any;
}
