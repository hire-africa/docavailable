/**
 * Message Sanitization Utility
 * 
 * Client-side validation to prevent sending messages with forbidden content.
 * This mirrors the backend MessageSanitizationService patterns.
 */

export const FORBIDDEN_PATTERNS = {
    SCRIPT_TAG: /<\s*script[^>]*>.*?<\s*\/\s*script\s*>/is,
    HTML_TAG: /<\/?[a-z][a-z0-9]*[^>]*>/i,
    URL: /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(?:\/|\b)/i,
    JAVASCRIPT_PROTOCOL: /javascript\s*:/i,
    DATA_URL: /data\s*:[^,]*,/i,
    EVENT_HANDLER: /\bon\w+\s*=/i,
};

export interface ValidationResult {
    isValid: boolean;
    reasons: string[];
}

/**
 * Validate a message for forbidden content
 * @param message The message to validate
 * @returns ValidationResult with isValid boolean and reasons array
 */
export function validateMessage(message: string): ValidationResult {
    const reasons: string[] = [];

    if (FORBIDDEN_PATTERNS.SCRIPT_TAG.test(message)) {
        reasons.push('Script tags are not allowed');
    }
    if (FORBIDDEN_PATTERNS.HTML_TAG.test(message)) {
        reasons.push('HTML tags are not allowed');
    }
    if (FORBIDDEN_PATTERNS.URL.test(message)) {
        reasons.push('URLs/links are not allowed in messages');
    }
    if (FORBIDDEN_PATTERNS.JAVASCRIPT_PROTOCOL.test(message)) {
        reasons.push('JavaScript protocol is not allowed');
    }
    if (FORBIDDEN_PATTERNS.DATA_URL.test(message)) {
        reasons.push('Data URLs are not allowed');
    }
    if (FORBIDDEN_PATTERNS.EVENT_HANDLER.test(message)) {
        reasons.push('Event handlers are not allowed');
    }

    return {
        isValid: reasons.length === 0,
        reasons,
    };
}

/**
 * Sanitize a message by removing forbidden content
 * Use this as a defense-in-depth measure. Primary validation should
 * use validateMessage() to reject messages outright.
 * 
 * @param message The message to sanitize
 * @returns The sanitized message
 */
export function sanitizeMessage(message: string): string {
    let sanitized = message;

    // Strip script tags completely
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.SCRIPT_TAG, '');

    // Strip all HTML tags
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.HTML_TAG, '');

    // Replace URLs with a placeholder
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.URL, '[link removed]');

    // Remove javascript: protocol
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.JAVASCRIPT_PROTOCOL, '');

    // Remove data: URLs
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.DATA_URL, '');

    // Remove event handlers
    sanitized = sanitized.replace(FORBIDDEN_PATTERNS.EVENT_HANDLER, '');

    // Trim and limit whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
}
