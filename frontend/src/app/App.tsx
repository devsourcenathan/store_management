import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { DesktopSetupGuard } from './DesktopSetupGuard';
import { SyncProvider } from '@/offline/SyncProvider';
import { StoreProvider } from '@/features/stores/StoreProvider';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { Toaster } from 'sonner';
import { UpdatePopup } from '@/components/UpdatePopup';

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
                <DesktopSetupGuard>
                    <AuthProvider>
                        <OrganizationProvider>
                            <StoreProvider>
                                <PermissionProvider>
                                    <SyncProvider>
                                        <AppRouter />
                                        <Toaster richColors position="top-center" />
                                        <UpdatePopup />
                                    </SyncProvider>
                                </PermissionProvider>
                            </StoreProvider>
                        </OrganizationProvider>
                    </AuthProvider>
                </DesktopSetupGuard>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
