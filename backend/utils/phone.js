/**
 * Phone number normalization utilities for WATI integration
 * Handles conversion between Twilio format (whatsapp:+919...) and WATI format (919...)
 */

/**
 * Convert phone number from Twilio/DB format to WATI format
 * @param {string} phone - Phone in format "whatsapp:+919876543210"
 * @returns {string} - Phone in format "919876543210" (digits only)
 * @example
 * toWaId("whatsapp:+919876543210") // "919876543210"
 * toWaId("+919876543210") // "919876543210"
 * toWaId("919876543210") // "919876543210"
 */
function toWaId(phone) {
    if (!phone) return '';
    
    // Remove whatsapp: prefix if present
    let cleaned = phone.replace(/^whatsapp:/i, '');
    
    // Remove + prefix if present
    cleaned = cleaned.replace(/^\+/, '');
    
    // Remove any non-digit characters
    cleaned = cleaned.replace(/\D/g, '');
    
    return cleaned;
}

/**
 * Convert phone number from WATI format to DB storage format
 * Keeps consistent whatsapp:+ prefix for database storage
 * @param {string} waId - Phone in WATI format "919876543210"
 * @returns {string} - Phone in format "whatsapp:+919876543210"
 * @example
 * fromWaId("919876543210") // "whatsapp:+919876543210"
 */
function fromWaId(waId) {
    if (!waId) return '';
    
    // Remove any existing prefixes/non-digits
    const cleaned = waId.replace(/\D/g, '');
    
    // Return with whatsapp: prefix
    return `whatsapp:+${cleaned}`;
}

/**
 * Validate if a phone number is in valid format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhone(phone) {
    if (!phone) return false;
    
    const cleaned = toWaId(phone);
    
    // Should have at least 10 digits (minimum for most countries)
    // and at most 15 digits (E.164 standard)
    return cleaned.length >= 10 && cleaned.length <= 15;
}

module.exports = {
    toWaId,
    fromWaId,
    isValidPhone
};
