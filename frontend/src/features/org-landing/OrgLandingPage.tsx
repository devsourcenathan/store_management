import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OrganizationLandingData } from '@/types/landing';
import { SectionRenderer } from './render';

export const OrgLandingPage = () => {
    const { subdomain } = useParams();
    const [landing, setLanding] = useState<OrganizationLandingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for testing until backend provides the new structure
        fetch(`http://localhost:3000/api/org-landing/subdomain/${subdomain}`)
             .then(res => res.json())
             .then(data => {
               setLanding(data);
             })
             .catch(err => {
               console.error("Error fetching landing data:", err);
               setLoading(false); // Set loading to false even on error
             })
             .finally(() => setLoading(false));
    }, [subdomain]);

    if (loading) return <div>Chargement...</div>;
    if (!landing) return <div>Page non trouvée pour cette organisation</div>;

    const globalStyles = {
        '--primary-color': landing.themeConfig?.primaryColor || '#4F46E5',
        '--secondary-color': landing.themeConfig?.secondaryColor || '#10B981',
        fontFamily: landing.themeConfig?.fontFamily || 'Inter, sans-serif',
        // Add other global theme styles here
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

