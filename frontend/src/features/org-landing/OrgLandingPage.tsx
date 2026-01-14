import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const OrgLandingPage = () => {
    const { subdomain } = useParams();
    const [landing, setLanding] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:3000/api/org-landing/subdomain/${subdomain}`)
            .then(res => res.json())
            .then(data => setLanding(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [subdomain]);

    if (loading) return <div>Loading...</div>;
    if (!landing) return <div>Organization not found</div>;

    const { title, description, themeConfig, sections } = landing;
    const primaryColor = themeConfig?.primaryColor || '#000000';

    return (
        <div className="min-h-screen bg-slate-50" style={{ '--primary': primaryColor } as any}>
            <header className="px-6 py-4 flex justify-between items-center bg-white shadow-sm">
                <div className="font-bold text-xl">{landing.organization?.name}</div>
                <Button>Contact Us</Button>
            </header>

            <section className="text-center py-20 px-4 bg-white">
                <h1 className="text-5xl font-bold mb-4">{title || 'Welcome'}</h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">{description}</p>
            </section>

            {sections && sections.map((section: any, idx: number) => (
                <section key={idx} className="py-16 px-6">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
                        <p>{section.content}</p>
                    </div>
                </section>
            ))}
        </div>
    );
};
