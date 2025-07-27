const Joi = require('joi');

const emailSchema = Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    text: Joi.string().optional(),
    html: Joi.string().optional(),
    from: Joi.string().email().optional(),
    cc: Joi.string().email().optional(),
    bcc: Joi.string().email().optional(),
    attachments: Joi.array().items(Joi.object({
        filename: Joi.string().required(),
        content: Joi.string().required(),
        contentType: Joi.string().optional()
    })).optional()
}).or('text', 'html');

const bulkEmailSchema = Joi.object({
    messages: Joi.array().items(emailSchema).min(1).max(50).required()
});

const templateEmailSchema = Joi.object({
    to: Joi.string().email().required(),
    templateId: Joi.string().valid('welcome', 'reset-password', 'order-confirmation').required(),
    variables: Joi.object().default({})
});

const validateEmail = (req, res, next) => {
    const { error } = emailSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.details[0].message,
            timestamp: new Date().toISOString()
        });
    }
    next();
};

const validateBulkEmail = (req, res, next) => {
    const { error } = bulkEmailSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.details[0].message,
            timestamp: new Date().toISOString()
        });
    }
    next();
};

const validateTemplateEmail = (req, res, next) => {
    const { error } = templateEmailSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.details[0].message,
            timestamp: new Date().toISOString()
        });
    }
    next();
};

module.exports = {
    validateEmail,
    validateBulkEmail,
    validateTemplateEmail
};