import { createClient } from '@/lib/supabase/server';
import { PaymentMethod } from '@/lib/types/database';

export interface PaymentMethodInput {
    name: string;
    description?: string | null;
    is_active?: boolean;
}

export const paymentMethodService = {
    /**
     * Get all payment methods (admin view)
     */
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching payment methods:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Get active payment methods only (for customers)
     */
    async getActivePaymentMethods(): Promise<PaymentMethod[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching active payment methods:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Create a new payment method
     */
    async createPaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('payment_methods')
            .insert({
                name: input.name,
                description: input.description || null,
                is_active: input.is_active ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating payment method:', error);
            throw error;
        }

        return data;
    },

    /**
     * Update an existing payment method
     */
    async updatePaymentMethod(id: string, input: Partial<PaymentMethodInput>): Promise<PaymentMethod> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('payment_methods')
            .update({
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.is_active !== undefined && { is_active: input.is_active }),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating payment method:', error);
            throw error;
        }

        return data;
    },

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(id: string): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting payment method:', error);
            throw error;
        }
    },
};
