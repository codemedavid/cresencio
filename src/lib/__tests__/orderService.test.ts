import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderService, IOrderService, SupabaseClientLike } from '../orderService.core';
import { Order, OrderWithDetails } from '@/lib/types/database';

// Mock order data for testing
const mockOrder: Order = {
    id: 'order-1',
    user_id: 'user-123',
    product_id: 'prod-456',
    variation_id: 'var-789',
    payment_method_id: 'pm-001',
    quantity: 2,
    description: 'Test order',
    reference_file_urls: [],
    status: 'pending',
    total_amount: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const mockOrderWithDetails: OrderWithDetails = {
    ...mockOrder,
    product: {
        id: 'prod-456',
        name: 'Test Product',
        description: 'A test product',
        base_price: 50,
        image_url: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    },
    user: {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        is_approved: true,
        id_proof_url: null,
        id_type: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    },
    variation: {
        id: 'var-789',
        product_id: 'prod-456',
        name: 'Size',
        value: 'Large',
        price_modifier: 10,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z'
    },
    payment_method: null
};

/**
 * Create a mock Supabase client for testing
 */
const createMockSupabaseClient = (options: {
    ordersData?: OrderWithDetails[];
    singleOrderData?: OrderWithDetails | null;
    createOrderData?: Order | null;
    updateOrderData?: Order | null;
    deleteSuccess?: boolean;
    error?: Error | null;
} = {}): SupabaseClientLike => {
    const {
        ordersData = [],
        singleOrderData = null,
        createOrderData = null,
        updateOrderData = null,
        deleteSuccess = true,
        error = null
    } = options;

    const mockSelectBuilder = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
            data: error ? null : ordersData,
            error: error
        }),
        single: vi.fn().mockResolvedValue({
            data: error ? null : singleOrderData,
            error: error
        })
    };

    const mockInsertBuilder = {
        select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
                data: error ? null : createOrderData,
                error: error
            })
        })
    };

    const mockUpdateBuilder = {
        eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: error ? null : updateOrderData,
                    error: error
                })
            })
        })
    };

    const mockDeleteBuilder = {
        eq: vi.fn().mockResolvedValue({
            data: null,
            error: deleteSuccess ? null : error
        })
    };

    return {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(mockSelectBuilder),
            insert: vi.fn().mockReturnValue(mockInsertBuilder),
            update: vi.fn().mockReturnValue(mockUpdateBuilder),
            delete: vi.fn().mockReturnValue(mockDeleteBuilder)
        })
    };
};

describe('OrderService', () => {
    let orderService: IOrderService;

    describe('createOrder', () => {
        it('should create an order successfully', async () => {
            const mockClient = createMockSupabaseClient({
                createOrderData: mockOrder
            });
            orderService = createOrderService(mockClient);

            const newOrder = {
                user_id: 'user-123',
                product_id: 'prod-456',
                quantity: 2,
                description: 'Test order',
                status: 'pending' as const
            };

            const result = await orderService.createOrder(newOrder);

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result).toEqual(mockOrder);
        });

        it('should throw error when create fails', async () => {
            const mockClient = createMockSupabaseClient({
                error: new Error('Database error')
            });
            orderService = createOrderService(mockClient);

            await expect(orderService.createOrder({ user_id: 'user-123' }))
                .rejects.toThrow('Database error');
        });
    });

    describe('getOrders', () => {
        it('should return all orders successfully', async () => {
            const mockOrders = [mockOrderWithDetails];
            const mockClient = createMockSupabaseClient({
                ordersData: mockOrders
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.getOrders();

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result).toEqual(mockOrders);
        });

        it('should throw error when fetch fails', async () => {
            const mockClient = createMockSupabaseClient({
                error: new Error('Database error')
            });
            orderService = createOrderService(mockClient);

            await expect(orderService.getOrders()).rejects.toThrow('Database error');
        });
    });

    describe('getOrdersByUserId', () => {
        it('should return orders for a specific user', async () => {
            const userId = 'user-123';
            const mockOrders = [mockOrderWithDetails];
            const mockClient = createMockSupabaseClient({
                ordersData: mockOrders
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.getOrdersByUserId(userId);

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result).toEqual(mockOrders);
        });

        it('should throw error when fetch fails', async () => {
            const mockClient = createMockSupabaseClient({
                error: new Error('Database error')
            });
            orderService = createOrderService(mockClient);

            await expect(orderService.getOrdersByUserId('user-123'))
                .rejects.toThrow('Database error');
        });
    });

    describe('getOrderById', () => {
        it('should return a single order by ID', async () => {
            const mockClient = createMockSupabaseClient({
                singleOrderData: mockOrderWithDetails
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.getOrderById('order-1');

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result).toEqual(mockOrderWithDetails);
        });

        it('should return null when order not found', async () => {
            const mockClient = createMockSupabaseClient({
                error: new Error('Not found')
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.getOrderById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status successfully', async () => {
            const updatedOrder = { ...mockOrder, status: 'completed' as const };
            const mockClient = createMockSupabaseClient({
                updateOrderData: updatedOrder
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.updateOrderStatus('order-1', 'completed');

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result?.status).toBe('completed');
        });

        it('should throw error when update fails', async () => {
            const mockClient = createMockSupabaseClient({
                error: new Error('Update failed')
            });
            orderService = createOrderService(mockClient);

            await expect(orderService.updateOrderStatus('order-1', 'completed'))
                .rejects.toThrow('Update failed');
        });
    });

    describe('deleteOrder', () => {
        it('should delete order successfully', async () => {
            const mockClient = createMockSupabaseClient({
                deleteSuccess: true
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.deleteOrder('order-1');

            expect(mockClient.from).toHaveBeenCalledWith('orders');
            expect(result).toBe(true);
        });

        it('should return false when delete fails', async () => {
            const mockClient = createMockSupabaseClient({
                deleteSuccess: false,
                error: new Error('Delete failed')
            });
            orderService = createOrderService(mockClient);

            const result = await orderService.deleteOrder('order-1');

            expect(result).toBe(false);
        });
    });
});

/**
 * Test helper factory for creating mock services in component tests
 * Use this when testing React components that depend on orderService
 */
export const createMockOrderService = (orders: OrderWithDetails[] = []): IOrderService => ({
    getOrders: vi.fn().mockResolvedValue(orders),
    getOrdersByUserId: vi.fn().mockResolvedValue(orders),
    getOrderById: vi.fn().mockResolvedValue(orders[0] || null),
    createOrder: vi.fn().mockResolvedValue(orders[0] || null),
    updateOrderStatus: vi.fn().mockResolvedValue(orders[0] || null),
    deleteOrder: vi.fn().mockResolvedValue(true)
});
