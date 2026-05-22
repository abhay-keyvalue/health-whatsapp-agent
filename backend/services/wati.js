/**
 * WATI WhatsApp API Client
 * Handles all interactions with WATI REST API for sending messages, files, and fetching media
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class WATIClient {
    constructor() {
        this.baseURL = process.env.WATI_API_BASE_URL;
        this.apiToken = process.env.WATI_API_TOKEN;
        this.tenantId = process.env.WATI_TENANT_ID;
        this.channelPhone = process.env.WATI_CHANNEL_PHONE;
        
        if (!this.baseURL || !this.apiToken) {
            console.warn('WATI_API_BASE_URL or WATI_API_TOKEN not configured');
        }
        
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
    }
    
    /**
     * Send a text message to a WhatsApp number
     * @param {string} waId - Recipient WhatsApp ID (digits only, e.g., "919876543210")
     * @param {string} text - Message text
     * @returns {Promise<Object>} - API response with whatsappMessageId, status, etc.
     */
    async sendSessionMessage(waId, text) {
        try {
            console.log(`[DEBUG] sendSessionMessage called with waId: ${waId}, text: "${text}", text length: ${text?.length}`);
            
            // WATI API format: POST /{tenantId}/api/v1/sendSessionMessage/{whatsappNumber}
            // Body should be URL-encoded form data: messageText=...
            const endpoint = this.tenantId 
                ? `/${this.tenantId}/api/v1/sendSessionMessage/${waId}`
                : `/api/v1/sendSessionMessage/${waId}`;
            
            const params = {};
            if (this.channelPhone) {
                params.channelNumber = this.channelPhone;
            }
            
            console.log(`[DEBUG] Full URL: ${this.baseURL}${endpoint}`);
            console.log(`[DEBUG] Query params:`, params);
            console.log(`[DEBUG] Body text:`, text);
            
            // Send as URL-encoded form data
            const formData = new URLSearchParams();
            formData.append('messageText', text);
            
            const response = await axios.post(
                `${this.baseURL}${endpoint}`,
                formData.toString(),
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    params: params
                }
            );
            
            console.log(`WATI message sent to ${waId}: ${response.data?.whatsappMessageId || 'success'}`);
            console.log('WATI API full response:', JSON.stringify(response.data, null, 2)); // DEBUG
            return response.data;
        } catch (error) {
            console.error('WATI sendSessionMessage error:', {
                waId,
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Failed to send WATI message: ${error.message}`);
        }
    }
    
    /**
     * Send a WhatsApp Template Message (for first contact or after 24h window)
     * @param {string} waId - Recipient WhatsApp ID (digits only, e.g., "919876543210")
     * @param {string} templateName - Name of approved template in WATI dashboard
     * @param {Array} parameters - Optional array of parameters for template variables
     * @param {string} broadcastName - Optional broadcast campaign name
     * @returns {Promise<Object>} - API response
     */
    async sendTemplateMessage(waId, templateName, parameters = [], broadcastName = 'API Broadcast') {
        try {
            const endpoint = `/api/v1/sendTemplateMessage`;
            
            const payload = {
                template_name: templateName,
                broadcast_name: broadcastName,
                parameters: parameters
            };
            
            const response = await this.client.post(endpoint, payload, {
                params: {
                    whatsappNumber: waId
                }
            });
            
            console.log(`WATI template message sent to ${waId}: ${templateName}`);
            console.log('WATI template API response:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('WATI sendTemplateMessage error:', {
                waId,
                templateName,
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Failed to send WATI template message: ${error.message}`);
        }
    }
    
    /**
     * Send a file (video, image, document, audio) to a WhatsApp number
     * @param {string} waId - Recipient WhatsApp ID (digits only)
     * @param {string} filePath - Full path to file on disk
     * @param {string} caption - Optional caption for the media
     * @param {string} mimeType - MIME type (e.g., "video/mp4", "image/jpeg")
     * @returns {Promise<Object>} - API response
     */
    async sendSessionFile(waId, filePath, caption = '', mimeType = '') {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            const endpoint = this.tenantId
                ? `/${this.tenantId}/api/v1/sendSessionFile/${waId}`
                : `/api/v1/sendSessionFile/${waId}`;
            
            const formData = new FormData();
            
            // Add file
            const fileStream = fs.createReadStream(filePath);
            const fileName = path.basename(filePath);
            formData.append('file', fileStream, {
                filename: fileName,
                contentType: mimeType || undefined
            });
            
            // Add caption if provided
            if (caption) {
                formData.append('caption', caption);
            }
            
            // Add channelPhoneNumber if configured
            if (this.channelPhone) {
                formData.append('channelPhoneNumber', this.channelPhone);
            }
            
            // Send with multipart/form-data headers
            const response = await this.client.post(endpoint, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${this.apiToken}`
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
            
            console.log(`WATI file sent to ${waId}: ${fileName}, messageId: ${response.data?.whatsappMessageId}`);
            return response.data;
        } catch (error) {
            console.error('WATI sendSessionFile error:', {
                waId,
                filePath,
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Failed to send WATI file: ${error.message}`);
        }
    }
    
    /**
     * Download media file from WATI
     * Used for inbound media from users (images, videos, documents, audio)
     * @param {string} fileName - File name from webhook data field (e.g., "data/images/uuid.jpg")
     * @returns {Promise<Buffer>} - File contents as buffer
     */
    async getMedia(fileName) {
        try {
            const endpoint = '/api/v1/getMedia';
            
            const response = await this.client.get(endpoint, {
                params: { fileName },
                responseType: 'arraybuffer' // Get binary data
            });
            
            console.log(`WATI media downloaded: ${fileName}, size: ${response.data.length} bytes`);
            return Buffer.from(response.data);
        } catch (error) {
            console.error('WATI getMedia error:', {
                fileName,
                message: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to get WATI media: ${error.message}`);
        }
    }
    
    /**
     * Check if WATI client is properly configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!(this.baseURL && this.apiToken);
    }
}

// Export singleton instance
module.exports = new WATIClient();
