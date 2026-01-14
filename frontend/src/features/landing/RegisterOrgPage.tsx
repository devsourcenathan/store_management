import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Assuming Input exists
import { useNavigate } from 'react-router-dom';

export const RegisterOrgPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        try {
            const res = await fetch('http://localhost:3000/api/landing/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                // Redirect to login or auto-login
                navigate('/login?registered=true');
            } else {
                console.error('Signup failed');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 p-6 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

            <div className="w-full max-w-lg relative z-10">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Join StockApp</h1>
                    <p className="text-blue-200">Start managing your business smarter today.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-blue-100">Organization Name</label>
                                <Input
                                    {...register('orgName', { required: true })}
                                    placeholder="e.g. Acme Corp"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-blue-400 transition-all"
                                />
                                {errors.orgName && <span className="text-rose-400 text-xs mt-1 block">Required</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-blue-100">Main Store Name</label>
                                <Input
                                    {...register('storeName', { required: true })}
                                    placeholder="e.g. Headquarters"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-blue-400 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-blue-100">First Name</label>
                                    <Input
                                        {...register('ownerFirstName', { required: true })}
                                        className="bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-blue-100">Last Name</label>
                                    <Input
                                        {...register('ownerLastName', { required: true })}
                                        className="bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-blue-100">Email Address</label>
                                <Input
                                    type="email"
                                    {...register('email', { required: true })}
                                    placeholder="you@company.com"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-blue-400 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-blue-100">Password</label>
                                <Input
                                    type="password"
                                    {...register('password', { required: true, minLength: 6 })}
                                    className="bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25 border-0 mt-2">
                            Create Account
                        </Button>

                        <p className="text-center text-sm text-blue-200/60 mt-4">
                            Already have an account? <span className="text-white hover:text-blue-300 cursor-pointer transition-colors" onClick={() => navigate('/login')}>Sign in</span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};
