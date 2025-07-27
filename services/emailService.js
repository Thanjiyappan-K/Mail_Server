const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = this.createTransporter();
    }

    createTransporter() {
        const config = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 10
        };
        logger.info('Creating email transporter with config:', {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.auth.user
        });
        return nodemailer.createTransport(config);
    }

    async sendEmail({ to, subject, text, html, from, cc, bcc, attachments }) {
        try {
            const mailOptions = {
                from: from /*|| process.env.SMTP_USER*/,
                to,
                subject,
                text,
                html,
                cc,
                bcc,
                attachments
            };
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${to}, MessageID: ${result.messageId}`);
            return result;
        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    async sendBulkEmail(messages) {
        const results = [];
        const batchSize = 10;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            const batchPromises = batch.map(async (message) => {
                try {
                    const result = await this.sendEmail(message);
                    return {
                        success: true,
                        to: message.to,
                        messageId: result.messageId,
                        timestamp: new Date().toISOString()
                    };
                } catch (error) {
                    return {
                        success: false,
                        to: message.to,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            if (i + batchSize < messages.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }

    async sendTemplateEmail(to, templateId, variables = {}) {
        const template = this.getEmailTemplate(templateId);
        if (!template) {
            throw new Error(`Template '${templateId}' not found`);
        }
        const html = this.renderTemplate(template.html, variables);
        const text = this.renderTemplate(template.text, variables);
        const subject = this.renderTemplate(template.subject, variables);
        return this.sendEmail({ to, subject, html, text });
    }

    getEmailTemplate(templateId) {
        const templates = {
            'welcome': {
                subject: 'Welcome {{name}}!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333;">Welcome {{name}}! 🎉</h1>
                        <p>Thank you for joining us! We're excited to have you on board.</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
                    </div>
                `,
                text: 'Welcome {{name}}! Thank you for joining us! We\'re excited to have you on board.'
            },
            'reset-password': {
                subject: 'Reset Your Password',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>You requested to reset your password. Click the button below to create a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{resetLink}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
                        </div>
                        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                        <p style="color: #666;">This link will expire in 24 hours.</p>
                    </div>
                `,
                text: 'You requested to reset your password. Visit this link to reset: {{resetLink}}'
            },
            'order-confirmation': {
                subject: 'Order Confirmation - {{orderNumber}}',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Order Confirmation</h2>
                        <p>Hi {{customerName}},</p>
                        <p>Thank you for your order! Your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Order Details:</h3>
                            <p><strong>Order Number:</strong> {{orderNumber}}</p>
                            <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
                            <p><strong>Estimated Delivery:</strong> {{deliveryDate}}</p>
                        </div>
                        <p>We'll send you another email when your order ships.</p>
                    </div>
                `,
                text: 'Hi {{customerName}}, your order {{orderNumber}} has been confirmed. Total: ${{totalAmount}}. Estimated delivery: {{deliveryDate}}'
            }
        };
        return templates[templateId];
    }

    getAvailableTemplates() {
        return {
            'welcome': 'Welcome email template',
            'reset-password': 'Password reset template',
            'order-confirmation': 'Order confirmation template'
        };
    }

    renderTemplate(template, variables) {
        let rendered = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, variables[key]);
        });
        return rendered;
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            return { status: 'Connected', message: 'SMTP connection successful' };
        } catch (error) {
            throw new Error(`SMTP connection failed: ${error.message}`);
        }
    }
}

module.exports = new EmailService();