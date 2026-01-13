import { describe, it, expect, vi } from 'vitest';
import { createUserService, IUserService, AdminUser } from '../userService.core';

// Mock Supabase client factory
const createMockSupabaseClient = (mockData: AdminUser[] = [], error: Error | null = null) => {
    const mockQueryBuilder = {
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
            data: error ? null : mockData,
            error: error,
        }),
    };

    return {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(mockQueryBuilder),
        }),
    };
};

describe('UserService', () => {
    let userService: IUserService;
    const mockUsers: AdminUser[] = [
        {
            id: 'user-1',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'user',
            is_approved: false,
            id_proof_url: null,
            id_type: null,
            created_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 'user-2',
            email: 'vip@example.com',
            full_name: 'VIP User',
            role: 'vip',
            is_approved: true,
            id_proof_url: 'https://example.com/id.jpg',
            id_type: 'student',
            created_at: '2024-01-02T00:00:00Z',
        },
        {
            id: 'user-3',
            email: 'pending@example.com',
            full_name: 'Pending VIP',
            role: 'vip',
            is_approved: false,
            id_proof_url: 'https://example.com/pending-id.jpg',
            id_type: 'senior',
            created_at: '2024-01-03T00:00:00Z',
        },
    ];

    describe('getUsers', () => {
        it('should return all users successfully', async () => {
            const mockClient = createMockSupabaseClient(mockUsers);
            userService = createUserService(mockClient);

            const result = await userService.getUsers();

            expect(result).toEqual(mockUsers);
            expect(mockClient.from).toHaveBeenCalledWith('profiles');
        });

        it('should return empty array on error', async () => {
            const mockClient = createMockSupabaseClient([], new Error('Database error'));
            userService = createUserService(mockClient);

            const result = await userService.getUsers();

            expect(result).toEqual([]);
        });
    });

    describe('getPendingVipRequests', () => {
        it('should filter pending VIP requests correctly', async () => {
            const pendingUsers = mockUsers.filter(u => u.role === 'vip' && !u.is_approved);
            const mockClient = createMockSupabaseClient(pendingUsers);
            userService = createUserService(mockClient);

            const result = await userService.getPendingVipRequests();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('user-3');
        });

        it('should return empty array when no pending requests', async () => {
            const mockClient = createMockSupabaseClient([]);
            userService = createUserService(mockClient);

            const result = await userService.getPendingVipRequests();

            expect(result).toEqual([]);
        });
    });

    describe('getVipRequests', () => {
        it('should return all users with ID proof', async () => {
            const vipRequests = mockUsers.filter(u => u.id_proof_url !== null);
            const mockClient = createMockSupabaseClient(vipRequests);
            userService = createUserService(mockClient);

            const result = await userService.getVipRequests();

            expect(result).toHaveLength(2);
        });
    });
});

/**
 * Test helper factory for creating mock services in component tests
 * Use this when testing React components that depend on userService
 */
export const createMockUserService = (users: AdminUser[] = []): IUserService => ({
    getUsers: vi.fn().mockResolvedValue(users),
    getPendingVipRequests: vi.fn().mockResolvedValue(
        users.filter(u => u.role === 'vip' && !u.is_approved && u.id_proof_url)
    ),
    getVipRequests: vi.fn().mockResolvedValue(
        users.filter(u => u.id_proof_url !== null)
    ),
});
