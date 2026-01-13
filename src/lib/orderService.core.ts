import { Order, OrderStatus, OrderWithDetails } from '@/lib/types/database';

/**
 * Interface for order service - enables dependency injection for testing
 */
export interface IOrderService {
    getOrders(): Promise<OrderWithDetails[]>;
    getOrdersByUserId(userId: string): Promise<OrderWithDetails[]>;
    getOrderById(id: string): Promise<OrderWithDetails | null>;
    createOrder(order: Partial<Order>): Promise<Order | null>;
    updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>;
    deleteOrder(id: string): Promise<boolean>;
}

/**
 * Supabase query result type for mocking
 */
export interface SupabaseQueryResult<T> {
    data: T | null;
    error: Error | null;
}

/**
 * Minimal Supabase client interface for dependency injection
 * This interface allows mocking without importing the real Supabase client
 */
export interface SupabaseClientLike {
    from(table: string): SupabaseTableBuilder;
}

export interface SupabaseTableBuilder {
    select(query: string): SupabaseSelectBuilder;
    insert(values: unknown[]): SupabaseInsertBuilder;
    update(values: Record<string, unknown>): SupabaseUpdateBuilder;
    delete(): SupabaseDeleteBuilder;
}

export interface SupabaseSelectBuilder {
    eq(column: string, value: unknown): SupabaseSelectBuilder;
    order(column: string, options?: { ascending?: boolean }): Promise<SupabaseQueryResult<OrderWithDetails[]>>;
    single(): Promise<SupabaseQueryResult<OrderWithDetails>>;
}

export interface SupabaseInsertBuilder {
    select(): SupabaseInsertSelectBuilder;
}

export interface SupabaseInsertSelectBuilder {
    single(): Promise<SupabaseQueryResult<Order>>;
}

export interface SupabaseUpdateBuilder {
    eq(column: string, value: unknown): SupabaseUpdateSelectBuilder;
}

export interface SupabaseUpdateSelectBuilder {
    select(): SupabaseUpdateFinalBuilder;
}

export interface SupabaseUpdateFinalBuilder {
    single(): Promise<SupabaseQueryResult<Order>>;
}

export interface SupabaseDeleteBuilder {
    eq(column: string, value: unknown): Promise<SupabaseQueryResult<null>>;
}

/**
 * Create an order service instance with the given Supabase client
 * This factory function enables dependency injection for testing
 */
export function createOrderService(supabaseClient: SupabaseClientLike): IOrderService {
    return {
        async getOrders(): Promise<OrderWithDetails[]> {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    product:products(*),
                    user:profiles(*),
                    variation:product_variations(*),
                    payment_method:payment_methods(*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching orders:', error);
                throw error;
            }

            return data as OrderWithDetails[];
        },

        async getOrdersByUserId(userId: string): Promise<OrderWithDetails[]> {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    product:products(*),
                    user:profiles(*),
                    variation:product_variations(*),
                    payment_method:payment_methods(*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user orders:', error);
                throw error;
            }

            return data as OrderWithDetails[];
        },

        async getOrderById(id: string): Promise<OrderWithDetails | null> {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    product:products(*),
                    user:profiles(*),
                    variation:product_variations(*),
                    payment_method:payment_methods(*)
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching order:', error);
                return null;
            }

            return data as OrderWithDetails;
        },

        async createOrder(order: Partial<Order>): Promise<Order | null> {
            const { data, error } = await supabaseClient
                .from('orders')
                .insert([order])
                .select()
                .single();

            if (error) {
                console.error('Error creating order:', error);
                throw error;
            }

            return data;
        },

        async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
            const { data, error } = await supabaseClient
                .from('orders')
                .update({ status })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating order status:', error);
                throw error;
            }

            return data;
        },

        async deleteOrder(id: string): Promise<boolean> {
            const { error } = await supabaseClient
                .from('orders')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting order:', error);
                return false;
            }

            return true;
        }
    };
}
