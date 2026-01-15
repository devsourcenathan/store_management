// frontend/src/features/org-landing/editor/ImportSiteDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Upload, FileCode, FileText } from 'lucide-react';

interface ImportSiteDialogProps {
    children: React.ReactNode;
    onImportSuccess: () => void;
}

export const ImportSiteDialog: React.FC<ImportSiteDialogProps> = ({ children, onImportSuccess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [htmlFile, setHtmlFile] = useState<File | null>(null);
    const [cssFile, setCssFile] = useState<File | null>(null);
    const [jsFile, setJsFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (type: 'html' | 'css' | 'js', file: File | null) => {
        switch (type) {
            case 'html':
                setHtmlFile(file);
                break;
            case 'css':
                setCssFile(file);
                break;
            case 'js':
                setJsFile(file);
                break;
        }
    };

    const handleImport = async () => {
        if (!htmlFile) {
            toast.error('HTML file is required');
            return;
        }

        setIsImporting(true);

        try {
            const htmlContent = await htmlFile.text();
            const cssContent = cssFile ? await cssFile.text() : undefined;
            const jsContent = jsFile ? await jsFile.text() : undefined;

            await api.post('/org-landing/import', {
                html: htmlContent,
                css: cssContent,
                js: jsContent,
            });

            toast.success('Site imported successfully!');
            setIsOpen(false);
            setHtmlFile(null);
            setCssFile(null);
            setJsFile(null);
            onImportSuccess();
        } catch (error: any) {
            console.error('Import failed:', error);
            toast.error('Failed to import site: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsImporting(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'html' | 'css' | 'js') => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileChange(type, file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const FileUploadZone = ({ type, file, icon: Icon }: { type: 'html' | 'css' | 'js'; file: File | null; icon: any }) => (
        <div
            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
            onDrop={(e) => handleDrop(e, type)}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById(`${type}-input`)?.click()}
        >
            <input
                id={`${type}-input`}
                type="file"
                accept={`.${type}`}
                className="hidden"
                onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
            />
            <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {file ? (
                <p className="text-sm font-medium">{file.name}</p>
            ) : (
                <>
                    <p className="text-sm font-medium">Drop {type.toUpperCase()} file here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                </>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import HTML/CSS/JS Site</DialogTitle>
                    <DialogDescription>
                        Upload your HTML, CSS, and JavaScript files to import an existing site into the editor.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>HTML File (Required)</Label>
                        <FileUploadZone type="html" file={htmlFile} icon={FileCode} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>CSS File (Optional)</Label>
                            <FileUploadZone type="css" file={cssFile} icon={FileText} />
                        </div>

                        <div className="space-y-2">
                            <Label>JavaScript File (Optional)</Label>
                            <FileUploadZone type="js" file={jsFile} icon={FileText} />
                        </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> The HTML will be parsed into editable sections and blocks.
                            You can switch between visual and code editing modes after import.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!htmlFile || isImporting}>
                        {isImporting ? 'Importing...' : 'Import Site'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
