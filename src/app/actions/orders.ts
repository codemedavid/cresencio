'use server';

import { createClient } from '@/lib/supabase/server';
import { createOrderService, SupabaseClientLike } from '@/lib/orderService';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@/lib/types/database';
import { sendOrderNotificationEmail, OrderEmailData, sendOrderCompletedEmail, OrderCompletionEmailData } from '@/lib/emailService';
import { getNotificationEmailAction } from './settings';

export async function createOrderAction(formData: FormData) {
    const supabase = await createClient();
    const orderService = createOrderService(supabase as unknown as SupabaseClientLike);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    try {
        const productId = formData.get('product_id') as string;
        const variationId = formData.get('variation_id') as string;
        const quantity = parseInt(formData.get('quantity') as string) || 1;
        const description = formData.get('description') as string;
        const referenceFileUrlsJson = formData.get('reference_file_urls') as string;
        let referenceFileUrls: string[] = [];
        if (referenceFileUrlsJson) {
            try {
                referenceFileUrls = JSON.parse(referenceFileUrlsJson);
            } catch (parseError) {
                console.error(
                    'Failed to parse reference_file_urls JSON:',
                    { value: referenceFileUrlsJson, error: parseError instanceof Error ? parseError.message : parseError }
                );
                // Fall back to empty array on parse failure
                referenceFileUrls = [];
            }
        }
        const paymentMethodId = formData.get('payment_method_id') as string;

        // Helper function to check if a string is a valid UUID
        const isValidUUID = (str: string): boolean => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
        };

        // If productId is 'custom' or empty, we treat it as no product link (null)
        const finalProductId = (productId && productId !== 'custom') ? productId : null;
        // Variation is only valid if a product is selected and variation_id is a valid UUID
        // The 'base' placeholder ID from ProductCard should be treated as null
        const finalVariationId = (finalProductId && variationId && isValidUUID(variationId)) ? variationId : null;
        // Payment method is optional
        const finalPaymentMethodId = paymentMethodId || null;

        // Calculate total_amount based on product price and variation modifier
        let totalAmount: number | null = null;
        let productName: string | null = null;
        let variationName: string | null = null;
        let paymentMethodName: string | null = null;

        if (finalProductId) {
            // Fetch the product to get base_price and name
            const { data: product } = await supabase
                .from('products')
                .select('base_price, name')
                .eq('id', finalProductId)
                .single();

            productName = product?.name ?? null;
            const basePrice = product?.base_price ?? 0;
            let priceModifier = 0;

            // If there's a variation, get its price modifier and name
            if (finalVariationId) {
                const { data: variation } = await supabase
                    .from('product_variations')
                    .select('price_modifier, name, value')
                    .eq('id', finalVariationId)
                    .single();
                priceModifier = variation?.price_modifier ?? 0;
                variationName = variation ? `${variation.name}: ${variation.value}` : null;
            }

            totalAmount = (basePrice + priceModifier) * quantity;
        }

        // Get payment method name if selected
        if (finalPaymentMethodId) {
            const { data: paymentMethod } = await supabase
                .from('payment_methods')
                .select('name')
                .eq('id', finalPaymentMethodId)
                .single();
            paymentMethodName = paymentMethod?.name ?? null;
        }

        // Get user profile for email
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

        console.log('Creating order for user:', user.id, {
            product_id: finalProductId,
            variation_id: finalVariationId,
            payment_method_id: finalPaymentMethodId,
            quantity,
        });

        const order = await orderService.createOrder({
            user_id: user.id,
            product_id: finalProductId,
            variation_id: finalVariationId,
            payment_method_id: finalPaymentMethodId,
            quantity,
            description,
            reference_file_urls: referenceFileUrls,
            status: 'pending',
            total_amount: totalAmount
        });

        console.log('Order created successfully:', order?.id);

        // Send email notification (non-blocking - don't fail order if email fails)
        if (order) {
            const notificationEmail = await getNotificationEmailAction();
            if (notificationEmail) {
                const emailData: OrderEmailData = {
                    orderId: order.id,
                    customerName: userProfile?.full_name || user.email || 'Unknown',
                    customerEmail: userProfile?.email || user.email || '',
                    productName,
                    variationName,
                    quantity,
                    totalAmount,
                    description,
                    referenceFileUrls,
                    paymentMethod: paymentMethodName,
                    createdAt: order.created_at,
                };
                // Fire and forget - don't await
                sendOrderNotificationEmail(notificationEmail, emailData).catch((err) => {
                    console.error('Failed to send order notification email:', err);
                });
            }
        }

        revalidatePath('/dashboard/my-orders');
        revalidatePath('/admin/dashboard');

        return { success: true };
    } catch (error) {
        console.error('Create order error for user:', user?.id, error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
        return { success: false, error: errorMessage };
    }
}

export async function getMyOrdersAction() {
    const supabase = await createClient();
    const orderService = createOrderService(supabase as unknown as SupabaseClientLike);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    try {
        return await orderService.getOrdersByUserId(user.id);
    } catch (error) {
        console.error('Get my orders error:', error);
        return [];
    }
}

export async function getAllOrdersAction() {
    const supabase = await createClient();
    const orderService = createOrderService(supabase as unknown as SupabaseClientLike);

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Verify admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return [];
    }

    try {
        return await orderService.getOrders();
    } catch (error) {
        console.error('Get all orders error:', error);
        return [];
    }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
    const supabase = await createClient();
    const orderService = createOrderService(supabase as unknown as SupabaseClientLike);

    // Check admin role
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

    try {
        // If status is being changed to 'completed', fetch order details for notification
        if (status === 'completed') {
            // Get order with all related data for the notification email
            const { data: orderDetails } = await supabase
                .from('orders')
                .select(`
                    *,
                    product:products(name),
                    variation:product_variations(name, value),
                    user:profiles(full_name, email)
                `)
                .eq('id', orderId)
                .single();

            if (orderDetails?.user?.email) {
                const emailData: OrderCompletionEmailData = {
                    orderId: orderDetails.id,
                    customerName: orderDetails.user.full_name || 'Valued Customer',
                    productName: orderDetails.product?.name || null,
                    variationName: orderDetails.variation
                        ? `${orderDetails.variation.name}: ${orderDetails.variation.value}`
                        : null,
                    quantity: orderDetails.quantity,
                    totalAmount: orderDetails.total_amount,
                    completedAt: new Date().toISOString(),
                };

                // Fire and forget - don't await, don't block the status update
                sendOrderCompletedEmail(orderDetails.user.email, emailData).catch((err) => {
                    console.error('Failed to send order completed email to customer:', err);
                });
            }
        }

        await orderService.updateOrderStatus(orderId, status);
        revalidatePath('/admin/dashboard');
        revalidatePath('/dashboard/my-orders');
        return { success: true };
    } catch (error) {
        console.error('Update status error:', error);
        return { success: false, error: 'Failed to update status' };
    }
}
