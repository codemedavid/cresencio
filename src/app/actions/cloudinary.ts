"use server";

import { v2 as cloudinary } from "cloudinary";

export async function getCloudinarySignature(folder: string) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Missing Cloudinary configuration");
    }

    if (!folder) {
        throw new Error("Folder parameter is required for Cloudinary signature");
    }

    // Configure cloudinary (though we only need utils really)
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Generate signature including the folder to prevent unsigned folder changes
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp,
            folder: folder,
        },
        apiSecret
    );

    return {
        timestamp,
        signature,
        cloudName,
        apiKey,
        folder,
    };
}
