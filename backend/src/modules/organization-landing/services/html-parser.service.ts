import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

interface Block {
    id: string;
    type: string;
    content: Record<string, any>;
    style?: Record<string, any>;
}

interface Section {
    id: string;
    type: string;
    settings?: Record<string, any>;
    blocks: Block[];
}

@Injectable()
export class HtmlParserService {
    /**
     * Parse HTML string and convert to sections/blocks format
     */
    parseHtml(html: string, css?: string): { sections: Section[]; themeConfig: any } {
        const $ = cheerio.load(html);
        const sections: Section[] = [];
        const themeConfig: any = {};

        // Extract theme colors from CSS if provided
        if (css) {
            themeConfig.primaryColor = this.extractPrimaryColor(css);
            themeConfig.fontFamily = this.extractFontFamily(css);
        }

        // Try to find sections in the HTML
        const sectionElements = $('section, .section, main > div, main > article');

        if (sectionElements.length > 0) {
            // Parse existing sections
            sectionElements.each((index, element) => {
                const section = this.parseSection($, element, index);
                if (section) {
                    sections.push(section);
                }
            });
        } else {
            // No sections found, create a single section with all body content
            const bodyContent = $('body').children();
            if (bodyContent.length > 0) {
                const section: Section = {
                    id: uuidv4(),
                    type: 'full-width',
                    settings: {},
                    blocks: []
                };

                bodyContent.each((index, element) => {
                    const block = this.parseElement($, element);
                    if (block) {
                        section.blocks.push(block);
                    }
                });

                if (section.blocks.length > 0) {
                    sections.push(section);
                }
            }
        }

        return { sections, themeConfig };
    }

    /**
     * Parse a section element
     */
    private parseSection($: any, element: any, index: number): Section | null {
        const $element = $(element);
        const section: Section = {
            id: uuidv4(),
            type: this.determineSectionType($, element),
            settings: this.extractStyles(element),
            blocks: []
        };

        // Parse child elements as blocks
        $element.children().each((i, child) => {
            const block = this.parseElement($, child);
            if (block) {
                section.blocks.push(block);
            }
        });

        return section.blocks.length > 0 ? section : null;
    }

    /**
     * Parse an HTML element into a block
     */
    private parseElement($: any, element: any): Block | null {
        const $element = $(element);
        // Check if element has tagName property (not a text node)
        if (!('tagName' in element)) return null;
        const tagName = (element as any).tagName?.toLowerCase();
        if (!tagName) return null;

        const block: Block = {
            id: uuidv4(),
            type: this.mapTagToBlockType(tagName),
            content: {},
            style: this.extractStyles(element)
        };

        // Extract content based on tag type
        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                block.type = 'heading';
                block.content = { text: $element.text().trim(), level: tagName };
                break;

            case 'p':
                block.type = 'paragraph';
                block.content = { text: $element.text().trim() };
                break;

            case 'img':
                block.type = 'image';
                block.content = {
                    src: $element.attr('src') || '',
                    alt: $element.attr('alt') || ''
                };
                break;

            case 'button':
            case 'a':
                block.type = 'button';
                block.content = {
                    text: $element.text().trim(),
                    href: $element.attr('href') || '#'
                };
                break;

            case 'div':
            case 'article':
            case 'aside':
                // For div and other containers, convert to rich-text
                block.type = 'rich-text';
                block.content = { html: $element.html() || '' };
                break;

            default:
                // Unknown tag, store as rich-text
                block.type = 'rich-text';
                block.content = { html: $.html(element) };
        }

        return block;
    }

    /**
     * Determine section type based on content
     */
    private determineSectionType($: any, element: any): string {
        const $element = $(element);
        const classes = $element.attr('class') || '';

        // Check for hero section indicators
        if (classes.includes('hero') || classes.includes('banner') || $element.find('h1').length > 0) {
            return 'hero';
        }

        // Check for two-column layout
        const columns = $element.find('.col, .column, [class*="col-"]');
        if (columns.length === 2) {
            return 'two-column';
        }

        // Default to full-width
        return 'full-width';
    }

    /**
     * Map HTML tag to block type
     */
    private mapTagToBlockType(tag: string): string {
        const mapping: Record<string, string> = {
            'h1': 'heading',
            'h2': 'heading',
            'h3': 'heading',
            'h4': 'heading',
            'h5': 'heading',
            'h6': 'heading',
            'p': 'paragraph',
            'img': 'image',
            'button': 'button',
            'a': 'button'
        };

        return mapping[tag] || 'rich-text';
    }

    /**
     * Extract inline styles from element
     */
    private extractStyles(element: any): Record<string, any> {
        const styleAttr = (element as any).attribs?.style;
        if (!styleAttr) return {};

        const styles: Record<string, any> = {};
        const stylePairs = styleAttr.split(';');

        stylePairs.forEach((pair: string) => {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
                // Convert kebab-case to camelCase
                const camelKey = key.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
                styles[camelKey] = value;
            }
        });

        return styles;
    }

    /**
     * Extract primary color from CSS
     */
    private extractPrimaryColor(css: string): string {
        // Look for common color patterns
        const colorMatch = css.match(/(?:primary|main|brand).*?:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/i);
        return colorMatch ? colorMatch[1] : '#3B82F6';
    }

    /**
     * Extract font family from CSS
     */
    private extractFontFamily(css: string): string {
        const fontMatch = css.match(/font-family:\s*([^;]+)/i);
        return fontMatch ? fontMatch[1].trim().replace(/['"]/g, '') : 'Inter, sans-serif';
    }

    /**
     * Convert sections/blocks back to HTML
     */
    generateHtml(sections: Section[], themeConfig: any, css?: string, js?: string): { html: string; css: string; js: string } {
        let html = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n';
        html += '  <meta charset="UTF-8">\n';
        html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
        html += '  <title>Landing Page</title>\n';

        if (css) {
            html += '  <style>\n' + css + '\n  </style>\n';
        }

        html += '</head>\n<body>\n';

        sections.forEach(section => {
            html += this.sectionToHtml(section);
        });

        if (js) {
            html += '  <script>\n' + js + '\n  </script>\n';
        }

        html += '</body>\n</html>';

        return {
            html,
            css: css || '',
            js: js || ''
        };
    }

    /**
     * Convert a section to HTML
     */
    private sectionToHtml(section: Section): string {
        const styles = this.stylesToString(section.settings || {});
        let html = `<section${styles ? ` style="${styles}"` : ''}>\n`;

        section.blocks.forEach(block => {
            html += '  ' + this.blockToHtml(block) + '\n';
        });

        html += '</section>\n';
        return html;
    }

    /**
     * Convert a block to HTML
     */
    private blockToHtml(block: Block): string {
        const styles = this.stylesToString(block.style || {});
        const styleAttr = styles ? ` style="${styles}"` : '';

        switch (block.type) {
            case 'heading':
                const level = block.content.level || 'h2';
                return `<${level}${styleAttr}>${block.content.text}</${level}>`;

            case 'paragraph':
                return `<p${styleAttr}>${block.content.text}</p>`;

            case 'image':
                return `<img src="${block.content.src}" alt="${block.content.alt || ''}"${styleAttr}>`;

            case 'button':
                return `<a href="${block.content.href || '#'}"${styleAttr}>${block.content.text}</a>`;

            case 'rich-text':
                return block.content.html || '';

            default:
                return '';
        }
    }

    /**
     * Convert style object to CSS string
     */
    private stylesToString(styles: Record<string, any>): string {
        return Object.entries(styles)
            .map(([key, value]) => {
                // Convert camelCase to kebab-case
                const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                return `${kebabKey}: ${value}`;
            })
            .join('; ');
    }
}
