"use client";

import Link from 'next/link';
import { ArrowLeft, Upload } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCloudinarySignature } from '@/app/actions/cloudinary';
import { useRouter } from 'next/navigation';
import { updateVipProfile } from './actions';

export default function RegisterPage() {
    const supabase = createClient();
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        idType: 'student',
    });
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        // Basic Validation
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields.');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            // Determine role based on whether VIP ID is being uploaded
            const role = file ? 'vip' : 'user';

            // 1. Sign up user - profile will be created automatically by database trigger
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: role,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Registration failed');

            // 2. If VIP, upload ID to Cloudinary
            if (file) {
                // Get signature from server (pass folder to include in signature)
                const { timestamp, signature, cloudName, apiKey, folder: signedFolder } = await getCloudinarySignature("id-proofs");

                // Prepare upload (use signedFolder to ensure consistency with signature)
                const uploadFormData = new FormData();
                uploadFormData.append("file", file);
                uploadFormData.append("api_key", apiKey);
                uploadFormData.append("timestamp", timestamp.toString());
                uploadFormData.append("signature", signature);
                uploadFormData.append("folder", signedFolder);

                // Upload to Cloudinary
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    {
                        method: "POST",
                        body: uploadFormData,
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || "Failed to upload ID proof");
                }

                const data = await response.json();
                const publicUrl = data.secure_url;

                // Update profile with VIP data using server action
                const result = await updateVipProfile({
                    userId: authData.user.id,
                    idProofUrl: publicUrl,
                    idType: formData.idType as 'student' | 'pwd' | 'senior',
                });

                if (!result.success) {
                    throw new Error(result.error || 'Failed to update VIP profile');
                }
            }

            setSuccess(true);
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                idType: 'student',
            });
            setFile(null);

            // Redirect to login after a short delay to show success message
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err: unknown) {
            console.error('Registration Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-pastel-yellow)] flex flex-col items-center justify-center p-4 py-12">

            {/* Back Button */}
            <div className="absolute top-8 left-8">
                <Link
                    href="/login"
                    className="flex items-center gap-2 font-bold px-4 py-2 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>
            </div>

            <div className="w-full max-w-xl mt-16 md:mt-0">
                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-4xl font-extrabold mb-2 uppercase tracking-tighter">Join the Club</h1>
                    <p className="font-bold mb-8 text-neutral-600">Create your account. Upload ID for VIP perks.</p>

                    {error && (
                        <div className="mb-6 bg-red-100 border-2 border-red-500 text-red-700 p-4 font-bold uppercase text-sm tracking-wide">
                            Error: {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-[var(--color-pastel-green)] border-2 border-green-700 text-green-900 p-4 font-bold uppercase text-sm tracking-wide">
                            {file
                                ? 'VIP Application Submitted! Please wait for admin approval before logging in.'
                                : 'Account Created! Please wait for admin approval before logging in.'}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Name Field */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block font-bold mb-2 text-sm uppercase tracking-wider"
                            >
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-[var(--color-pastel-blue)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="John Doe"
                                disabled={loading}
                            />
                        </div>

                        {/* Email Field */}
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
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full bg-[var(--color-pastel-blue)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="name@example.com"
                                disabled={loading}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full bg-[var(--color-pastel-pink)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block font-bold mb-2 text-sm uppercase tracking-wider"
                                >
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="w-full bg-[var(--color-pastel-pink)] border-2 border-black p-4 font-bold placeholder:text-neutral-500 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* ID Verification Section */}
                        <div className="border-2 border-black border-dashed p-6 bg-neutral-50">
                            <h3 className="font-bold text-lg uppercase mb-2">Get VIP Status (Optional)</h3>
                            <p className="text-xs font-bold text-neutral-500 mb-4 uppercase tracking-wide">Upload ID to unlock exclusive perks. Skip to register as a normal member.</p>

                            <div className="mb-4">
                                <label
                                    htmlFor="idType"
                                    className="block font-bold mb-2 text-sm uppercase tracking-wider"
                                >
                                    Select ID Type
                                </label>
                                <div className="relative">
                                    <select
                                        id="idType"
                                        value={formData.idType}
                                        onChange={handleInputChange}
                                        className="w-full appearance-none bg-white border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        disabled={loading}
                                    >
                                        <option value="student">Student ID</option>
                                        <option value="pwd">PWD ID</option>
                                        <option value="senior">Senior Citizen ID</option>
                                    </select>
                                    <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none border-t-[8px] border-t-black border-x-[6px] border-x-transparent" />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="id-upload"
                                    className="block font-bold mb-2 text-sm uppercase tracking-wider"
                                >
                                    Upload ID Photo
                                </label>
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        id="id-upload"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={loading}
                                    />
                                    <div className={`flex flex-col items-center justify-center border-2 border-black p-6 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${file ? 'bg-[var(--color-pastel-blue)]' : 'bg-[var(--color-pastel-green)]'}`}>
                                        <Upload className="w-8 h-8 mb-2" />
                                        <span className="font-bold text-center">{file ? file.name : 'Click to upload or drag and drop'}</span>
                                        <span className="text-xs font-bold mt-1 opacity-70">JPG, PNG up to 5MB</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-[var(--color-brand-cyan)] text-white border-2 border-black p-4 font-extrabold uppercase tracking-widest text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Processing...' : (file ? 'Submit VIP Application' : 'Create Account')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
