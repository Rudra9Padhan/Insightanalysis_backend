// routes/contact.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const { body, validationResult } = require('express-validator');

// Optional: nodemailer for outgoing notification (commented block later)
const sendNotificationEmail = async (contact) => {
  if (process.env.DISABLE_EMAIL === 'true') return;
  // If you want to use nodemailer, implement here and use env vars:
  // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO
  // Keep this out of request-critical path (send after 200 OK).
};

router.post('/',
  // Validation
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message cannot be empty'),
    body('service').optional().isString(),
    body('companyName').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, companyName = '', service = '', message } = req.body;

      // Basic anti-spam: simple honeypot (frontend can send honeypot field)
      if (req.body.honeypot) {
        // silently accept but do not save
        return res.status(200).json({ status: 'ok' });
      }

      const contact = new Contact({
        name,
        email,
        companyName,
        service,
        message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      await contact.save();

      // Fire-and-forget email or webhook to CRM
      sendNotificationEmail(contact).catch(err => console.error('Email send failed', err));

      // Optionally trigger CRM integration here (e.g., Zoho webhook)
      // callCrmWebhook(contact).catch(...)

      return res.status(201).json({ status: 'created', id: contact._id });
    } catch (err) {
      console.error('POST /api/contact error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
