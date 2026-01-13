import { Role } from '@/lib/types/database';

/**
 * Admin user type for dashboard display
 */
export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
    is_approved: boolean;
    id_proof_url: string | null;
    id_type: string | null;
    created_at: string;
}

/**
 * Interface for user service - enables dependency injection for testing
 */
export interface IUserService {
    getUsers(): Promise<AdminUser[]>;
    getPendingVipRequests(): Promise<AdminUser[]>;
    getVipRequests(): Promise<AdminUser[]>;
}

/**
 * Minimal Supabase client interface for dependency injection
 * This interface allows mocking without importing the real Supabase client
 */
export interface SupabaseClientLike {
    from(table: string): {
        select(query: string): {
            eq(column: string, value: unknown): SupabaseQueryBuilder;
            not(column: string, operator: string, value: unknown): SupabaseQueryBuilder;
            order(column: string, options?: { ascending?: boolean }): Promise<{ data: AdminUser[] | null; error: Error | null }>;
        };
    };
}

interface SupabaseQueryBuilder {
    eq(column: string, value: unknown): SupabaseQueryBuilder;
    not(column: string, operator: string, value: unknown): SupabaseQueryBuilder;
    order(column: string, options?: { ascending?: boolean }): Promise<{ data: AdminUser[] | null; error: Error | null }>;
}

/**
 * Create a user service instance with the given Supabase client
 * This factory function enables dependency injection for testing
 */
export function createUserService(supabaseClient: SupabaseClientLike): IUserService {
    return {
        async getUsers(): Promise<AdminUser[]> {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('id, email, full_name, role, is_approved, id_proof_url, id_type, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching users:', error);
                return [];
            }

            return data as AdminUser[];
        },

        async getPendingVipRequests(): Promise<AdminUser[]> {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('id, email, full_name, role, is_approved, id_proof_url, id_type, created_at')
                .eq('role', 'vip')
                .eq('is_approved', false)
                .not('id_proof_url', 'is', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching pending VIP requests:', error);
                return [];
            }

            return data as AdminUser[];
        },

        async getVipRequests(): Promise<AdminUser[]> {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('id, email, full_name, role, is_approved, id_proof_url, id_type, created_at')
                .not('id_proof_url', 'is', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching VIP requests:', error);
                return [];
            }

            return data as AdminUser[];
        }
    };
}
