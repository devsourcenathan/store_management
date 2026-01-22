import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TemplateRendererService {
    private readonly logger = new Logger(TemplateRendererService.name);
    private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

    constructor(private readonly configService: ConfigService) {
        this.registerHelpers();
    }

    /**
     * Register custom Handlebars helpers
     */
    private registerHelpers(): void {
        Handlebars.registerHelper('gt', (a, b) => a > b);
        Handlebars.registerHelper('lt', (a, b) => a < b);
        Handlebars.registerHelper('eq', (a, b) => a === b);
        Handlebars.registerHelper('ne', (a, b) => a !== b);
        Handlebars.registerHelper('gte', (a, b) => a >= b);
        Handlebars.registerHelper('lte', (a, b) => a <= b);
    }

    /**
     * Render a template with the given context
     */
    async renderTemplate(templateName: string, context: any): Promise<string> {
        try {
            const template = this.getTemplate(templateName);
            return template(context);
        } catch (error) {
            this.logger.error(`Failed to render template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Get a compiled template (with caching)
     */
    private getTemplate(templateName: string): HandlebarsTemplateDelegate {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        const templatePath = join(__dirname, '..', 'templates', `${templateName}.hbs`);
        const templateSource = readFileSync(templatePath, 'utf-8');
        const compiledTemplate = Handlebars.compile(templateSource);

        this.templateCache.set(templateName, compiledTemplate);
        return compiledTemplate;
    }

    /**
     * Clear the template cache (useful for development)
     */
    clearCache(): void {
        this.templateCache.clear();
    }
}
