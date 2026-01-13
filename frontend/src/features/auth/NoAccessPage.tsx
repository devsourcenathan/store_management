import { Store, LogOut, Phone, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';

export function NoAccessPage() {
    // Cast user to any to avoid type errors since the full relation structure might not be in the strict User type yet
    const { user, logout } = useAuth() as any;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center">
                <div className="bg-red-50 p-8 flex justify-center">
                    <div className="bg-red-100 p-4 rounded-full relative">
                        <Store className="w-12 h-12 text-red-600 opacity-50" />
                        <ShieldAlert className="w-6 h-6 text-red-700 absolute -bottom-2 -right-2 bg-white rounded-full bg-opacity-90 p-0.5" />
                    </div>
                </div>

                <div className="p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Store Assigned</h2>
                    <p className="text-gray-600 mb-8">
                        Hello {user?.firstName}, it seems you don't have access to any store yet.
                        Please contact your manager to get assigned to a store.
                    </p>

                    <div className="flex flex-col gap-3">
                        {user?.organization?.phone && (
                            <a
                                href={`tel:${user.organization.phone}`}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                            >
                                <Phone className="w-4 h-4" />
                                Call Support ({user.organization.phone})
                            </a>
                        )}

                        <button
                            onClick={logout}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 py-4 px-8 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        Organization: {user?.organization?.name || 'Unknown'}
                    </p>
                </div>
            </div>
        </div>
    );
}
