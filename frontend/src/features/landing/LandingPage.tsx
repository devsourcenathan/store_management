import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';

interface LandingContent {
    heroTitle: string;
    heroSubtitle?: string;
    ctaText?: string;
    sections?: any[];
}

export const LandingPage = () => {
    const [content, setContent] = useState<LandingContent | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const API_BASE_URL = getApiBaseUrl();
        fetch(`${API_BASE_URL}/landing/content`)
            .then(res => res.json())
            .then(data => setContent(data))
            .catch(err => console.error('Failed to fetch landing content', err));
    }, []);

    if (!content) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">StockApp</span>
                    </div>
                    <div className="space-x-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-600 hover:text-blue-600 dark:text-slate-300">Login</Button>
                        </Link>
                        <Link to="/register-org">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105">Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-900/40" />
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-500/10 to-transparent" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 text-center lg:text-left flex flex-col lg:flex-row items-center">
                    <div className="lg:w-1/2 space-y-8">
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
                            {content.heroTitle}
                            <span className="block text-blue-400">Simplified.</span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-blue-500 pl-6">
                            {content.heroSubtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link to="/register-org">
                                <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20">
                                    {content.ctaText || 'Start Free Trial'}
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                View Demo
                            </Button>
                        </div>
                    </div>

                    {/* Hero Visual/Placeholder */}
                    <div className="lg:w-1/2 mt-12 lg:mt-0 relative">
                        <div className="relative rounded-xl bg-slate-800/50 border border-slate-700 p-2 shadow-2xl backdrop-blur-xl rotate-y-12 transform transition-all hover:rotate-0 duration-700">
                            <div className="rounded-lg bg-slate-900 aspect-video flex items-center justify-center text-slate-500">
                                Dashboard Preview
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sections (Dynamic) */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950">
                {content.sections && content.sections.map((section: any, idx: number) => (
                    <section key={idx} className={`py-24 px-6 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-950'}`}>
                        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                            <div className={`lg:w-1/2 ${idx % 2 !== 0 ? 'lg:order-2' : ''}`}>
                                <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">{section.title}</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{section.content}</p>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-inner flex items-center justify-center text-slate-400">
                                    Feature Visual {idx + 1}
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            {/* Footer */}
            <footer className="py-12 px-6 bg-slate-900 text-slate-400 border-t border-slate-800 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} StockApp. Built for growth.</p>
            </footer>
        </div>
    );
};
