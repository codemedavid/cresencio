'use server';

import { paymentMethodService, PaymentMethodInput } from '@/lib/paymentMethodService';
import { revalidatePath } from 'next/cache';

export async function getPaymentMethodsAction() {
    try {
        return await paymentMethodService.getPaymentMethods();
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return [];
    }
}

export async function getActivePaymentMethodsAction() {
    try {
        return await paymentMethodService.getActivePaymentMethods();
    } catch (error) {
        console.error('Error fetching active payment methods:', error);
        return [];
    }
}

export async function createPaymentMethodAction(input: PaymentMethodInput) {
    try {
        const result = await paymentMethodService.createPaymentMethod(input);
        revalidatePath('/admin/dashboard');
        return { success: true, data: result };
    } catch (error) {
        console.error('Error creating payment method:', error);
        return { success: false, error: 'Failed to create payment method' };
    }
}

export async function updatePaymentMethodAction(id: string, input: Partial<PaymentMethodInput>) {
    try {
        const result = await paymentMethodService.updatePaymentMethod(id, input);
        revalidatePath('/admin/dashboard');
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating payment method:', error);
        return { success: false, error: 'Failed to update payment method' };
    }
}

export async function deletePaymentMethodAction(id: string) {
    try {
        await paymentMethodService.deletePaymentMethod(id);
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting payment method:', error);
        return { success: false, error: 'Failed to delete payment method' };
    }
}
