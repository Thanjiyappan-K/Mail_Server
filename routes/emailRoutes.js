const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { validateEmail, validateBulkEmail, validateTemplateEmail } = require('../middleware/validation');
const logger = require('../utils/logger');

// Send single email
router.post('/send', validateEmail, async (req, res) => {
    try {
        logger.info(`Sending email to: ${req.body.to}`);
        const result = await emailService.sendEmail(req.body);
        res.json({
            success: true,
            messageId: result.messageId,
            message: 'Email sent successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to send email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Send bulk emails
router.post('/send-bulk', validateBulkEmail, async (req, res) => {
    try {
        logger.info(`Sending bulk emails to ${req.body.messages.length} recipients`);
        const results = await emailService.sendBulkEmail(req.body.messages);
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        res.json({
            success: true,
            results,
            summary: {
                total: results.length,
                successful: successCount,
                failed: failureCount
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to send bulk emails:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send bulk emails',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Send template email
router.post('/send-template', validateTemplateEmail, async (req, res) => {
    try {
        const { to, templateId, variables } = req.body;
        logger.info(`Sending template email (${templateId}) to: ${to}`);
        const result = await emailService.sendTemplateEmail(to, templateId, variables);
        res.json({
            success: true,
            messageId: result.messageId,
            templateId,
            message: 'Template email sent successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to send template email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send template email',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get available templates
router.get('/templates', (req, res) => {
    try {
        const templates = emailService.getAvailableTemplates();
        res.json({
            success: true,
            templates,
            count: Object.keys(templates).length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get templates',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test email configuration
router.post('/test', async (req, res) => {
    try {
        const testResult = await emailService.testConnection();
        res.json({
            success: true,
            message: 'Email configuration test successful',
            details: testResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Email configuration test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Email configuration test failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;