import nodemailer from 'nodemailer';

/**
 * Email configuration using Gmail with App Password
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param value - The string to escape, or null/undefined
 * @returns The escaped string, or empty string for falsy values
 */
function escapeHtml(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format a date string for email display with consistent locale and timezone
 * Uses Philippine locale (en-PH) and Asia/Manila timezone for consistency
 * @param dateString - The ISO date string to format
 * @returns Formatted date string
 */
function formatDateForEmail(dateString: string): string {
    return new Date(dateString).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
    });
}

export interface OrderEmailData {
    orderId: string;
    customerName: string;
    customerEmail: string;
    productName: string | null;
    variationName: string | null;
    quantity: number;
    totalAmount: number | null;
    description: string | null;
    referenceFileUrls: string[];
    paymentMethod: string | null;
    createdAt: string;
}

/**
 * Send order notification email to admin
 */
export async function sendOrderNotificationEmail(
    recipientEmail: string,
    orderData: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('Gmail credentials not configured');
        return { success: false, error: 'Email credentials not configured' };
    }

    const {
        orderId,
        customerName,
        customerEmail,
        productName,
        variationName,
        quantity,
        totalAmount,
        description,
        referenceFileUrls,
        paymentMethod,
        createdAt,
    } = orderData;

    const subject = `🆕 New Order Received - ${orderId.slice(0, 8)}`;

    const productInfo = productName
        ? `${escapeHtml(productName)}${variationName ? ` (${escapeHtml(variationName)})` : ''}`
        : 'Custom Request';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                .footer { background: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
                .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .amount { font-size: 24px; font-weight: bold; color: #059669; }
                .btn { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">📦 New Order Received!</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Order ID: ${orderId.slice(0, 8)}...</p>
                </div>
                <div class="content">
                    <div class="detail-row">
                        <span class="label">Customer:</span>
                        <span class="value">${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Product:</span>
                        <span class="value">${productInfo}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Quantity:</span>
                        <span class="value">${quantity}</span>
                    </div>
                    ${totalAmount ? `
                    <div class="detail-row">
                        <span class="label">Total Amount:</span>
                        <span class="amount">₱${totalAmount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${paymentMethod ? `
                    <div class="detail-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">${escapeHtml(paymentMethod)}</span>
                    </div>
                    ` : ''}
                    ${description ? `
                    <div class="detail-row">
                        <span class="label">Description:</span>
                        <span class="value">${escapeHtml(description)}</span>
                    </div>
                    ` : ''}
                    ${referenceFileUrls && referenceFileUrls.length > 0 ? `
                    <div class="detail-row">
                        <span class="label">Attached Files (${referenceFileUrls.length}):</span>
                        <div>${referenceFileUrls.map((url, i) => `<a href="${escapeHtml(url)}" style="color: #4F46E5; display: block; margin: 2px 0;">Attachment ${i + 1}</a>`).join('')}</div>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="label">Order Date:</span>
                        <span class="value">${formatDateForEmail(createdAt)}</span>
                    </div>
                </div>
                <div class="footer">
                    <p style="margin: 0;">This is an automated notification from your order system.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Order System" <${process.env.GMAIL_USER}>`,
            to: recipientEmail,
            subject,
            html,
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export interface OrderCompletionEmailData {
    orderId: string;
    customerName: string;
    productName: string | null;
    variationName: string | null;
    quantity: number;
    totalAmount: number | null;
    completedAt: string;
}

/**
 * Send order completed notification email to customer
 */
export async function sendOrderCompletedEmail(
    customerEmail: string,
    orderData: OrderCompletionEmailData
): Promise<{ success: boolean; error?: string }> {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('Gmail credentials not configured');
        return { success: false, error: 'Email credentials not configured' };
    }

    const {
        orderId,
        customerName,
        productName,
        variationName,
        quantity,
        totalAmount,
        completedAt,
    } = orderData;

    const subject = `✅ Your Order is Complete - ${orderId.slice(0, 8)}`;

    const productInfo = productName
        ? `${escapeHtml(productName)}${variationName ? ` (${escapeHtml(variationName)})` : ''}`
        : 'Custom Request';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
                .footer { background: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; text-align: center; }
                .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .amount { font-size: 20px; font-weight: bold; color: #059669; }
                .success-icon { font-size: 48px; margin-bottom: 10px; }
                .thank-you { background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin-top: 20px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">🎉</div>
                    <h1 style="margin: 0;">Order Completed!</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Order ID: ${orderId.slice(0, 8)}...</p>
                </div>
                <div class="content">
                    <p>Hi ${escapeHtml(customerName)},</p>
                    <p>Great news! Your order has been completed and is ready.</p>
                    
                    <div class="detail-row">
                        <span class="label">Product:</span>
                        <span class="value">${productInfo}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Quantity:</span>
                        <span class="value">${quantity}</span>
                    </div>
                    ${totalAmount ? `
                    <div class="detail-row">
                        <span class="label">Total Amount:</span>
                        <span class="amount">₱${totalAmount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="label">Completed On:</span>
                        <span class="value">${formatDateForEmail(completedAt)}</span>
                    </div>
                    
                    <div class="thank-you">
                        <strong>Thank you for your order!</strong><br>
                        We appreciate your business and hope you enjoy your purchase.
                    </div>
                </div>
                <div class="footer">
                    <p style="margin: 0;">Thank you for choosing us!</p>
                    <p style="margin: 5px 0 0 0;">This is an automated notification from our order system.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Order System" <${process.env.GMAIL_USER}>`,
            to: customerEmail,
            subject,
            html,
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send order completed email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
