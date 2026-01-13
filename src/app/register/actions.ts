'use server'

import { createClient } from '@/lib/supabase/server'

// Define allowed ID types
export type IdType = 'student' | 'pwd' | 'senior';
const ALLOWED_ID_TYPES: Set<string> = new Set(['student', 'pwd', 'senior']);

interface UpdateVipProfileData {
    userId: string;
    idProofUrl: string;
    idType: string;
}

export async function updateVipProfile(data: UpdateVipProfileData) {
    // 1. Validate Input
    if (!data.userId || data.userId.trim() === '') {
        console.error('Validation Error: userId is missing or empty');
        return { success: false, error: 'Invalid user ID' };
    }

    // Cast string to IdType for check (or just check existence)
    if (!ALLOWED_ID_TYPES.has(data.idType)) {
        console.error(`Validation Error: Invalid idType '${data.idType}'`);
        return { success: false, error: 'Invalid ID type provided' };
    }

    try {
        new URL(data.idProofUrl);
    } catch {
        console.error('Validation Error: Invalid idProofUrl');
        return { success: false, error: 'Invalid ID proof URL' };
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({
            role: 'vip',
            id_proof_url: data.idProofUrl,
            id_type: data.idType,
        })
        .eq('id', data.userId);

    if (error) {
        console.error('Error updating VIP profile:', error);
        return { success: false, error: 'Unable to update profile. Please try again later.' };
    }

    return { success: true };
}

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verifies that the current caller is an admin user.
 * Returns the admin status and any error message.
 */
async function verifyAdminAuthorization(): Promise<{ isAdmin: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { isAdmin: false, error: 'Unauthorized' };
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return { isAdmin: false, error: 'Unauthorized' };
        }

        if (profile.role !== 'admin') {
            return { isAdmin: false, error: 'Unauthorized' };
        }

        return { isAdmin: true };
    } catch (error) {
        console.error('Error verifying admin authorization:', error);
        return { isAdmin: false, error: 'Unauthorized' };
    }
}

/**
 * Helper function to update a user's profile approval status.
 * Consolidates common Supabase update logic for admin operations.
 */
async function updateProfileApproval(
    userId: string,
    updates: { is_approved?: boolean; role?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating profile:', error);
            return { success: false, error: 'Internal server error' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in updateProfileApproval:', error);
        return { success: false, error: 'Internal server error' };
    }
}

export async function approveVipRequest(userId: string) {
    if (!userId) return { success: false, error: 'Invalid User ID' };

    // Verify caller is an admin
    const authCheck = await verifyAdminAuthorization();
    if (!authCheck.isAdmin) {
        return { success: false, error: 'Unauthorized' };
    }

    return updateProfileApproval(userId, { role: 'vip', is_approved: true });
}

export async function rejectVipRequest(userId: string) {
    if (!userId) return { success: false, error: 'Invalid User ID' };

    // Verify caller is an admin
    const authCheck = await verifyAdminAuthorization();
    if (!authCheck.isAdmin) {
        return { success: false, error: 'Unauthorized' };
    }

    // When rejecting, we set is_approved to false. 
    // We might also want to revert the role to 'user' if we want to force them to re-apply,
    // but for now we keep 'vip' role so they stay in the "Pending" state (vip + unapproved).
    return updateProfileApproval(userId, { is_approved: false });
}

export async function approveUser(userId: string) {
    if (!userId) return { success: false, error: 'Invalid User ID' };

    // Verify caller is an admin
    const authCheck = await verifyAdminAuthorization();
    if (!authCheck.isAdmin) {
        return { success: false, error: 'Unauthorized' };
    }

    return updateProfileApproval(userId, { is_approved: true });
}
