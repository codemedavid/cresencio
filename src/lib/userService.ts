import { createClient } from '@/lib/supabase/client';
import { createUserService, IUserService, AdminUser, SupabaseClientLike } from './userService.core';

// Re-export types for consumers
export type { IUserService, AdminUser, SupabaseClientLike };
export { createUserService };

// Default instance using browser client
const supabase = createClient();
export const userService: IUserService = createUserService(supabase as unknown as SupabaseClientLike);
