"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Sign in
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;
            if (!user) throw new Error('Login failed');

            // 2. Check profile approval status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', user.id)
                .single();

            if (profileError) {
                // If profile doesn't exist but auth does, something is wrong. 
                // Could handle by auto-creating a profile or just erroring.
                throw new Error('Profile not found. Please contact support.');
            }

            if (!profile.is_approved) {
                // Sign out immediately if not approved
                await supabase.auth.signOut();
                throw new Error('Your account is pending admin approval.');
            }

            // 3. Redirect based on role
            if (profile.role === 'admin') {
                router.push('/admin/dashboard');
            } else {
                router.push('/dashboard');
            }
            router.refresh();

        } catch (err: unknown) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-pastel-yellow)] flex flex-col items-center justify-center p-4">

            {/* Back Button */}
            <div className="absolute top-8 left-8">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold px-4 py-2 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
            </div>

            <div className="w-full max-w-md">
                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-4xl font-extrabold mb-2 uppercase tracking-tighter">Login</h1>
                    <p className="font-bold mb-8 text-neutral-600">Welcome back, VIP!</p>

                    {error && (
                        <div className="mb-6 bg-red-100 border-2 border-red-500 text-red-700 p-4 font-bold uppercase text-sm tracking-wide">
                            Error: {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label
                                htmlFor="email"
                                className="block font-bold mb-2 text-sm uppercase tracking-wider"
                            >
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[var(--color-pastel-blue)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="name@example.com"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block font-bold mb-2 text-sm uppercase tracking-wider"
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--color-pastel-pink)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-[var(--color-brand-cyan)] text-white border-2 border-black p-4 font-extrabold uppercase tracking-widest text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <div className="text-center font-bold text-sm mt-6">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-[var(--color-brand-magenta)] hover:underline decoration-2">
                                Join the Club
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
