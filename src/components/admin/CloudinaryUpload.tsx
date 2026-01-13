"use client";

import { useState } from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { getCloudinarySignature } from "@/app/actions/cloudinary";

interface CloudinaryUploadProps {
    onUpload: (url: string) => void;
    defaultImage?: string;
    label?: string;
    folder?: string;
}

export default function CloudinaryUpload({ onUpload, defaultImage, label = "Product Image", folder = "products" }: CloudinaryUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(defaultImage || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("File size too large. Max 5MB.");
            return;
        }

        // Reset state
        setError(null);
        setUploading(true);

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            // 1. Get signature from server (pass folder to include in signature)
            const { timestamp, signature, cloudName, apiKey, folder: signedFolder } = await getCloudinarySignature(folder);

            // 2. Prepare upload (use signedFolder to ensure consistency with signature)
            const formData = new FormData();
            formData.append("file", file);
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp.toString());
            formData.append("signature", signature);
            formData.append("folder", signedFolder);

            // 3. Upload to Cloudinary
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Upload failed");
            }

            const data = await response.json();
            onUpload(data.secure_url);
        } catch (err: unknown) {
            console.error("Upload error:", err);
            setError(err instanceof Error ? err.message : "Failed to upload image");
            // Revert preview only if we really want to enforce strict sync, 
            // but keeping local preview until they try again might be better UX?
            // For now, let's keep the local preview but show error.
            // If it was a critical error, maybe clear it.
            // setPreview(defaultImage || null); 
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onUpload("");
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>

            {error && (
                <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                </div>
            )}

            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 transition-colors">
                {preview ? (
                    <div className="relative">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-64 rounded-md object-contain"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {uploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-md">
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 text-center">
                        {uploading ? (
                            <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                        ) : (
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                            >
                                <span>Upload a file</span>
                                <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 10MB
                        </p>
                    </div>
                )}
            </div>
            {!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
                <p className="mt-2 text-xs text-amber-600">
                    Warning: Cloudinary env vars might be missing.
                </p>
            )}
        </div>
    );
}
