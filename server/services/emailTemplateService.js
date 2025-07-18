// server/services/emailTemplateService.js
const fs = require('fs').promises;
const path = require('path');

// Template renderer using simple string replacement
const renderTemplate = (templateHtml, data) => {
  let rendered = templateHtml;
  
  // Replace all template variables
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = data[key] || '';
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Handle conditional blocks (simple implementation)
  // Remove {{#if something}} blocks if value is empty
  rendered = rendered.replace(/{{#if \w+}}[\s\S]*?{{\/if}}/g, (match) => {
    const varName = match.match(/{{#if (\w+)}}/)[1];
    return data[varName] ? match.replace(/{{#if \w+}}/g, '').replace(/{{\/if}}/g, '') : '';
  });
  
  return rendered;
};

// Load and render email template
const renderEmailTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const templateHtml = await fs.readFile(templatePath, 'utf8');
    
    // Add default values
    const templateData = {
      appUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe`,
      ...data
    };
    
    return renderTemplate(templateHtml, templateData);
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw error;
  }
};

// Format date for email display
const formatDateForEmail = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

module.exports = {
  renderEmailTemplate,
  formatDateForEmail
};