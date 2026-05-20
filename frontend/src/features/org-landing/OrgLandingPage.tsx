import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OrganizationLandingData } from '@/types/landing';
import { SectionRenderer } from './render';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';

export const OrgLandingPage = () => {
    const { subdomain } = useParams();
    const [landing, setLanding] = useState<OrganizationLandingData | null>(null);
    const [loading, setLoading] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const API_BASE_URL = getApiBaseUrl();
        fetch(`${API_BASE_URL}/org-landing/subdomain/${subdomain}`)
            .then(res => res.json())
            .then(data => {
                setLanding(data);
            })
            .catch(err => {
                console.error("Error fetching landing data:", err);
                setLoading(false);
            })
            .finally(() => setLoading(false));
    }, [subdomain]);

    // If rawHtml exists, render in iframe for complete isolation
    useEffect(() => {
        if (!landing?.rawHtml || !iframeRef.current) return;

        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) return;

        // Build complete HTML document
        let htmlContent = landing.rawHtml;

        // Add base CSS reset to prevent conflicts
        const baseStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: auto; overflow-x: hidden; }
            body { background: white; }
        `;

        // Prepare full CSS
        let fullCss = baseStyles;
        if (landing.rawCss) {
            fullCss = baseStyles + '\n' + landing.rawCss;
        }

        // Inject CSS if exists
        if (landing.rawCss) {
            // Check if HTML already has a head tag
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('</head>', `<style>${fullCss}</style></head>`);
            } else if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', `<html><head><style>${fullCss}</style></head>`);
            } else {
                htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${fullCss}</style></head><body>${htmlContent}</body></html>`;
            }
        } else {
            // Add base styles even if no custom CSS
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('</head>', `<style>${baseStyles}</style></head>`);
            } else if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', `<html><head><style>${baseStyles}</style></head>`);
            } else {
                htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head><body>${htmlContent}</body></html>`;
            }
        }

        // Inject JS if exists
        if (landing.rawJs) {
            if (htmlContent.includes('</body>')) {
                htmlContent = htmlContent.replace('</body>', `<script>${landing.rawJs}</script></body>`);
            } else {
                htmlContent += `<script>${landing.rawJs}</script>`;
            }
        }

        // Write to iframe
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Auto-resize iframe to content height
        const resizeIframe = () => {
            if (iframeDoc.body) {
                iframe.style.height = iframeDoc.body.scrollHeight + 'px';
            }
        };

        // Resize on load and when content changes
        iframe.onload = resizeIframe;
        setTimeout(resizeIframe, 100);
        setTimeout(resizeIframe, 500); // Second check after animations

        // Watch for content changes
        const observer = new MutationObserver(resizeIframe);
        if (iframeDoc.body) {
            observer.observe(iframeDoc.body, {
                childList: true,
                subtree: true,
                attributes: true
            });
        }

        return () => observer.disconnect();
    }, [landing?.rawHtml, landing?.rawCss, landing?.rawJs]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
    if (!landing) return <div className="flex items-center justify-center min-h-screen">Page non trouvée pour cette organisation</div>;

    // If rawHtml exists, render in iframe for complete isolation
    if (landing.rawHtml) {
        return (
            <iframe
                ref={iframeRef}
                className="w-full border-0"
                style={{ minHeight: '100vh' }}
                title="Landing Page"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
        );
    }

    // Otherwise, render using sections (visual editor mode)
    const globalStyles = {
        '--primary-color': landing.themeConfig?.primaryColor || '#4F46E5',
        '--secondary-color': landing.themeConfig?.secondaryColor || '#10B981',
        fontFamily: landing.themeConfig?.fontFamily || 'Inter, sans-serif',
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800" style={globalStyles as React.CSSProperties}>
            <header className="px-6 py-4 flex justify-between items-center bg-white shadow-sm">
                <div className="font-bold text-xl" style={{ color: 'var(--primary-color)' }}>{landing.organization?.name}</div>
                <Button style={{ backgroundColor: 'var(--primary-color)' }}>Contactez-nous</Button>
            </header>

            <main>
                {landing.sections && landing.sections.map((section, idx) => (
                    <SectionRenderer key={section.id || idx} section={section} />
                ))}
            </main>
        </div>
    );
};
