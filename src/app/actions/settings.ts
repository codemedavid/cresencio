'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SETTING_KEYS } from '@/lib/constants';

interface SettingResult {
    success: boolean;
    value?: string;
    error?: string;
}

/**
 * Get a setting value by key (admin-only)
 */
export async function getSettingAction(key: string): Promise<SettingResult> {
    const supabase = await createClient();

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Not authorized' };
    }

    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return { success: false, error: error.message };
    }

    return { success: true, value: data?.value || '' };
}

/**
 * Set a setting value (admin-only)
 */
export async function setSettingAction(key: string, value: string): Promise<SettingResult> {
    const supabase = await createClient();

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Not authorized' };
    }

    // Upsert the setting
    const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/dashboard');
    return { success: true, value };
}

/**
 * Get notification email setting (admin-only)
 * Delegates to getSettingAction to enforce authentication and authorization.
 */
export async function getNotificationEmailAction(): Promise<string | null> {
    const result = await getSettingAction(SETTING_KEYS.NOTIFICATION_EMAIL);

    if (!result.success) {
        // Return null if not authenticated/authorized or on error
        return null;
    }

    return result.value || null;
}
