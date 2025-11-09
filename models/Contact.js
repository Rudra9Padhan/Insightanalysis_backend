// models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, trim: true, lowercase: true, index: true },
  companyName:{ type: String, default: '', trim: true },
  service:    { type: String, default: '', trim: true },
  message:    { type: String, required: true, trim: true },
  ip:         { type: String },
  userAgent:  { type: String },
  status:     { type: String, enum: ['new','reviewed','archived'], default: 'new' },
  createdAt:  { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// Optional: text index for message search
ContactSchema.index({ message: 'text', name: 'text', companyName: 'text' });

module.exports = mongoose.model('Contact', ContactSchema);
