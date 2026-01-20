import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, Mail, Lock, User, Briefcase, Check, Store } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet.tsx';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function UserList() {
    const { t } = useTranslation();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    const { data: stores, isLoading: isLoadingStores } = useQuery({
        queryKey: ['stores'],
        queryFn: async () => {
            const res = await api.get('/stores');
            return res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/users', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsSheetOpen(false);
            setEditingUser(null);
            toast.success(t('settings.team.messages.invite_success'));
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || t('settings.team.messages.invite_error'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.patch(`/users/${editingUser.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsSheetOpen(false);
            setEditingUser(null);
            toast.success(t('settings.team.messages.update_success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(t('settings.team.messages.delete_success'));
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Handle storeIds manually since they are checkboxes
        const storeIds = Array.from(formData.getAll('storeIds'));

        const data: any = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            role: formData.get('role'),
            storeIds: storeIds
        };

        if (formData.get('password')) {
            data.password = formData.get('password');
        }

        if (editingUser) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleOpenSheet = (user: any = null) => {
        setEditingUser(user);
        setIsSheetOpen(true);
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.team.title')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('settings.team.subtitle')}</p>
                </div>
                <button
                    onClick={() => handleOpenSheet(null)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('settings.team.invite_user')}
                </button>
            </div>

            {/* Users Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 text-left rounded-lg overflow-hidden shadow-sm transition-colors">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {users?.map((user: any) => (
                        <div key={user.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center flex-1">
                                    <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 shadow-sm">
                                        {user.firstName[0]}{user.lastName[0]}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-2">
                                    <button
                                        onClick={() => handleOpenSheet(user)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    {user.role !== 'OWNER' && (
                                        <button
                                            onClick={() => {
                                                if (confirm(t('settings.team.delete_confirm'))) {
                                                    deleteMutation.mutate(user.id);
                                                }
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Role</p>
                                    <span className={`px-2 py-0.5 inline-flex items-center gap-1 text-xs font-medium rounded-full border
                                        ${user.role === 'OWNER' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                                            user.role === 'MANAGER' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                                'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'}`}>
                                        {user.role}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Stores</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.stores?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.team.list.user')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.team.list.role')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.team.list.stores')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.team.list.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users?.map((user: any) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 shadow-sm">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-xs font-medium rounded-full border
                                        ${user.role === 'OWNER' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                                                user.role === 'MANAGER' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                                    'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'}`}>
                                            {user.role === 'OWNER' && <Check className="w-3 h-3" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {t('settings.team.list.stores_count', { count: user.stores?.length || 0 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenSheet(user)}
                                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {user.role !== 'OWNER' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t('settings.team.delete_confirm'))) {
                                                            deleteMutation.mutate(user.id);
                                                        }
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] dark:bg-gray-800 dark:text-gray-100">
                    <SheetHeader>
                        <SheetTitle className="text-2xl dark:text-gray-100">{editingUser ? t('settings.team.form.edit_title') : t('settings.team.form.invite_title')}</SheetTitle>
                        <SheetDescription className="dark:text-gray-400">
                            {editingUser ? t('settings.team.form.edit_desc') : t('settings.team.form.invite_desc')}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 mt-8">

                        {/* Name Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {t('settings.team.form.first_name')}
                                </label>
                                <input
                                    name="firstName"
                                    defaultValue={editingUser?.firstName}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.team.form.last_name')}</label>
                                <input
                                    name="lastName"
                                    defaultValue={editingUser?.lastName}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {t('settings.team.form.email')}
                            </label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={editingUser?.email}
                                disabled={!!editingUser}
                                className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${editingUser ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'dark:bg-gray-700 dark:text-white'}`}
                                placeholder="john@example.com"
                                required
                            />
                            {editingUser && <p className="text-xs text-gray-400">{t('settings.team.form.email_hint')}</p>}
                        </div>

                        {/* Password (Only for new users) */}
                        {!editingUser && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-gray-400" />
                                    {t('settings.team.form.password')}
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.team.form.password_hint')}</p>
                            </div>
                        )}

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                {t('settings.team.form.role')}
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[].map((role) => (
                                    <label key={role} className={`
                                        relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                                        ${(editingUser?.role || 'STAFF') === role
                                        } 
                                    `}>
                                    </label>
                                ))}
                                <select
                                    name="role"
                                    defaultValue={editingUser?.role || 'STAFF'}
                                    className="col-span-3 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="STAFF">{t('settings.team.form.roles.staff')}</option>
                                    <option value="MANAGER">{t('settings.team.form.roles.manager')}</option>
                                    <option value="OWNER">{t('settings.team.form.roles.owner')}</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('settings.team.form.role_hint')}
                            </p>
                        </div>

                        {/* Store Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Store className="w-4 h-4 text-gray-400" />
                                {t('settings.team.form.stores')}
                            </label>
                            {isLoadingStores ? (
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('settings.team.form.loading_stores')}</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    {stores?.map((store: any) => {
                                        const isAssigned = editingUser?.stores?.some((s: any) => s.storeId === store.id);
                                        return (
                                            <label key={store.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    name="storeIds"
                                                    value={store.id}
                                                    defaultChecked={isAssigned}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{store.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.team.form.stores_hint')}</p>
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSheetOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium flex items-center gap-2"
                            >
                                {editingUser ? (
                                    <>
                                        <Check className="w-4 h-4" /> {t('settings.team.form.save')}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" /> {t('settings.team.form.send_invite')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
