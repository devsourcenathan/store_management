// frontend/src/features/org-landing/editor/ExportSiteDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Download, Copy } from 'lucide-react';

interface ExportSiteDialogProps {
    children: React.ReactNode;
}

export const ExportSiteDialog: React.FC<ExportSiteDialogProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'single' | 'separate') => {
        setIsExporting(true);

        try {
            const { data } = await api.get('/org-landing/export');
            const { html, css, js } = data;

            if (format === 'single') {
                // Download as single HTML file with inline CSS/JS
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'landing-page.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Download as separate files
                const files = [
                    { content: html, name: 'index.html', type: 'text/html' },
                    { content: css, name: 'styles.css', type: 'text/css' },
                    { content: js, name: 'script.js', type: 'text/javascript' },
                ];

                files.forEach(file => {
                    if (file.content) {
                        const blob = new Blob([file.content], { type: file.type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                });
            }

            toast.success('Site exported successfully!');
            setIsOpen(false);
        } catch (error: any) {
            console.error('Export failed:', error);
            toast.error('Failed to export site: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopyToClipboard = async () => {
        try {
            const { data } = await api.get('/org-landing/export');
            await navigator.clipboard.writeText(data.html);
            toast.success('HTML copied to clipboard!');
        } catch (error: any) {
            console.error('Copy failed:', error);
            toast.error('Failed to copy to clipboard');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Landing Page</DialogTitle>
                    <DialogDescription>
                        Download your landing page as HTML/CSS/JS files
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExport('single')}
                        disabled={isExporting}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download as Single HTML File
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExport('separate')}
                        disabled={isExporting}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download as Separate Files (HTML + CSS + JS)
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleCopyToClipboard}
                        disabled={isExporting}
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy HTML to Clipboard
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
