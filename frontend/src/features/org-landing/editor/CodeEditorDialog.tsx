// frontend/src/features/org-landing/editor/CodeEditorDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Code2, Save } from 'lucide-react';

interface CodeEditorDialogProps {
    children: React.ReactNode;
    onSave: () => void;
}

export const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({ children, onSave }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [html, setHtml] = useState('');
    const [css, setCss] = useState('');
    const [js, setJs] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadCode();
        }
    }, [isOpen]);

    const loadCode = async () => {
        setIsLoading(true);
        try {
            // First, toggle to code mode to generate HTML from current sections
            await api.post('/org-landing/toggle-mode', { mode: 'code' });

            // Then fetch the exported code
            const { data } = await api.get('/org-landing/export');
            setHtml(data.html || '');
            setCss(data.css || '');
            setJs(data.js || '');
        } catch (error: any) {
            console.error('Failed to load code:', error);
            toast.error('Failed to load code editor');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Import the modified code
            await api.post('/org-landing/import', { html, css, js });

            // Toggle back to visual mode
            await api.post('/org-landing/toggle-mode', { mode: 'visual' });

            toast.success('Code saved successfully!');
            setIsOpen(false);
            onSave();
        } catch (error: any) {
            console.error('Failed to save code:', error);
            toast.error('Failed to save code: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5" />
                        Code Editor
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground">Loading code...</p>
                    </div>
                ) : (
                    <Tabs defaultValue="html" className="flex-1 flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="html">HTML</TabsTrigger>
                            <TabsTrigger value="css">CSS</TabsTrigger>
                            <TabsTrigger value="js">JavaScript</TabsTrigger>
                        </TabsList>

                        <TabsContent value="html" className="flex-1 mt-4">
                            <textarea
                                className="w-full h-full p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                placeholder="HTML code..."
                                spellCheck={false}
                            />
                        </TabsContent>

                        <TabsContent value="css" className="flex-1 mt-4">
                            <textarea
                                className="w-full h-full p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                value={css}
                                onChange={(e) => setCss(e.target.value)}
                                placeholder="CSS code..."
                                spellCheck={false}
                            />
                        </TabsContent>

                        <TabsContent value="js" className="flex-1 mt-4">
                            <textarea
                                className="w-full h-full p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                value={js}
                                onChange={(e) => setJs(e.target.value)}
                                placeholder="JavaScript code..."
                                spellCheck={false}
                            />
                        </TabsContent>
                    </Tabs>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save & Apply'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
