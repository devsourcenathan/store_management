import { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Branding Side (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

                <div className="relative z-10 w-full flex flex-col justify-center px-12 text-white">
                    <div className="mb-8">
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-lg">
                            {/* <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg> */}
                        </div>
                        <h1 className="text-4xl font-bold mb-4 tracking-tight">Roxanne App</h1>
                        <p className="text-lg text-blue-100 max-w-md leading-relaxed">
                            {t('auth.branding_quote', 'Manage your inventory with precision and ease. The modern solution for growing businesses.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center relative">
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                    <LanguageSelector />
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="mb-10">
                        {/* Mobile Logo */}
                        <div className="lg:hidden h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4 shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
                    </div>

                    {children}

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            &copy; {new Date().getFullYear()} Stock Protocol. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
