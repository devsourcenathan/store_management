import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, Mail, Lock, User, Briefcase, Check, Store } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { toast } from 'sonner';

export function UserList() {
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
            toast.success('User invited successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create user');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.patch(`/users/${editingUser.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsSheetOpen(false);
            setEditingUser(null);
            toast.success('User updated successfully');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User removed');
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

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                    <p className="text-sm text-gray-500">Manage access and roles for your organization</p>
                </div>
                <button
                    onClick={() => handleOpenSheet(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Invite User
                </button>
            </div>

            <div className="bg-white border text-left rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stores</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users?.map((user: any) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-xs font-medium rounded-full border
                                        ${user.role === 'OWNER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-green-50 text-green-700 border-green-200'}`}>
                                        {user.role === 'OWNER' && <Check className="w-3 h-3" />}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.stores?.length || 0} stores
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenSheet(user)}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        {user.role !== 'OWNER' && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to remove this user?')) {
                                                        deleteMutation.mutate(user.id);
                                                    }
                                                }}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="text-2xl">{editingUser ? 'Edit Team Member' : 'Invite New Member'}</SheetTitle>
                        <SheetDescription>
                            {editingUser ? 'Update user details and access rights.' : 'Send an invitation to join your organization.'}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 mt-8">

                        {/* Name Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    First Name
                                </label>
                                <input
                                    name="firstName"
                                    defaultValue={editingUser?.firstName}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    name="lastName"
                                    defaultValue={editingUser?.lastName}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                Email Address
                            </label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={editingUser?.email}
                                disabled={!!editingUser}
                                className={`w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                placeholder="john@example.com"
                                required
                            />
                            {editingUser && <p className="text-xs text-gray-400">Email cannot be changed after creation.</p>}
                        </div>

                        {/* Password (Only for new users) */}
                        {!editingUser && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-gray-400" />
                                    Initial Password
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-gray-500">Must be at least 6 characters long.</p>
                            </div>
                        )}

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                Role
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['STAFF', 'MANAGER', 'OWNER'].map((role) => (
                                    <label key={role} className={`
                                        relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                                        ${(editingUser?.role || 'STAFF') === role // This simple check won't work perfectly with controlled/uncontrolled mix, but relying on default value:
                                        // To make this visually toggleable properly without state, we rely on the radio input logic + CSS peer-checked or similar, 
                                        // OR we just use a select. But user asked for "improved style".
                                        // Let's stick to a styled Select for simplicity and robustness in this uncontrolled form, 
                                        // OR use a radio group. Let's use a Select but styled better.
                                        } 
                                    `}>
                                        {/* Actually, let's just use a nice select dropdown for now to ensure form data capture works easily with native FormData */}
                                    </label>
                                ))}
                                <select
                                    name="role"
                                    defaultValue={editingUser?.role || 'STAFF'}
                                    className="col-span-3 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="STAFF">Staff (Limited Access)</option>
                                    <option value="MANAGER">Manager (Store Admin)</option>
                                    <option value="OWNER">Owner (Full Access)</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500">
                                Staff members can process sales. Managers can manage stock. Owners have full access.
                            </p>
                        </div>

                        {/* Store Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Store className="w-4 h-4 text-gray-400" />
                                Assigned Stores
                            </label>
                            {isLoadingStores ? (
                                <div className="text-sm text-gray-500">Loading stores...</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                                    {stores?.map((store: any) => {
                                        const isAssigned = editingUser?.stores?.some((s: any) => s.storeId === store.id);
                                        return (
                                            <label key={store.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    name="storeIds"
                                                    value={store.id}
                                                    defaultChecked={isAssigned}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm text-gray-700 font-medium">{store.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">Select which stores this user can access.</p>
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSheetOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium flex items-center gap-2"
                            >
                                {editingUser ? (
                                    <>
                                        <Check className="w-4 h-4" /> Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" /> Send Invitation
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
