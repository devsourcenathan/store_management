import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { Check, Loader2, Settings2 } from 'lucide-react';

export function SetupPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remoteUrl: 'https://api.roxanneapp.com/api',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password || !formData.remoteUrl) {
            toast.error('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/desktop-config/setup', formData);
            toast.success('Configuration réussie. Redirection...');
            
            // Wait a little bit for the UI to update, then navigate to login
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 1500);
        } catch (error: any) {
            console.error('Setup failed', error);
            const msg = error.response?.data?.message || error.message || "Échec de l'initialisation";
            toast.error(msg);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardHeader className="space-y-1 bg-primary/5 pb-8 pt-8 rounded-t-xl text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">Configuration Initiale</CardTitle>
                    <CardDescription className="text-gray-500">
                        Connectez-vous à votre compte pour synchroniser vos données.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-lg">Synchronisation en cours</h3>
                                <p className="text-sm text-gray-500 max-w-[250px]">
                                    Veuillez patienter pendant que nous récupérons et installons vos données sur cet ordinateur...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="vous@exemple.com"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center text-sm text-gray-500 hover:text-primary transition-colors"
                                >
                                    <Settings2 className="w-4 h-4 mr-2" />
                                    {showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="space-y-2 pt-2 pb-2 bg-gray-50 p-4 rounded-md border">
                                    <Label htmlFor="remoteUrl" className="text-gray-700">URL du serveur distant</Label>
                                    <Input
                                        id="remoteUrl"
                                        name="remoteUrl"
                                        type="url"
                                        required
                                        value={formData.remoteUrl}
                                        onChange={handleChange}
                                        className="bg-white"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Modifiez ceci uniquement si vous utilisez un serveur personnalisé.
                                    </p>
                                </div>
                            )}

                            <Button type="submit" className="w-full" size="lg">
                                <Check className="w-4 h-4 mr-2" />
                                Démarrer l'installation
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
