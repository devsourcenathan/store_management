import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { SyncProvider } from '@/offline/SyncProvider';
import { StoreProvider } from '@/features/stores/StoreProvider';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <OrganizationProvider>
                        <StoreProvider>
                            <SyncProvider>
                                <AppRouter />
                                <Toaster richColors position="top-center" />
                            </SyncProvider>
                        </StoreProvider>
                    </OrganizationProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
