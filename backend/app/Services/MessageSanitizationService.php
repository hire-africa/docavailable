<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * MessageSanitizationService
 *
 * Security service to sanitize chat messages and block malicious content.
 * Blocks scripts, HTML tags, and URLs to prevent XSS and phishing attacks.
 */
class MessageSanitizationService
{
    /**
     * Patterns for forbidden content detection
     */
    private const SCRIPT_PATTERN = '/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/is';
    private const HTML_TAG_PATTERN = '/<\/?[a-z][a-z0-9]*[^>]*>/i';
    private const URL_PATTERN = '/(?:https?:\/\/|www\.)[^\s<>"\']+|\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(?:\/|\b)/i';
    private const JAVASCRIPT_PATTERN = '/javascript\s*:/i';
    private const DATA_URL_PATTERN = '/data\s*:[^,]*,/i';
    private const EVENT_HANDLER_PATTERN = '/\bon\w+\s*=/i';

    /**
     * Check if message contains forbidden content
     *
     * @param string $message The message to check
     * @return array Contains 'hasForbidden' boolean and 'reasons' array
     */
    public function containsForbiddenContent(string $message): array
    {
        $reasons = [];

        // Check for script tags
        if (preg_match(self::SCRIPT_PATTERN, $message)) {
            $reasons[] = 'Script tags are not allowed';
        }

        // Check for HTML tags
        if (preg_match(self::HTML_TAG_PATTERN, $message)) {
            $reasons[] = 'HTML tags are not allowed';
        }

        // Check for URLs
        if (preg_match(self::URL_PATTERN, $message)) {
            $reasons[] = 'URLs are not allowed in messages';
        }

        // Check for javascript: protocol
        if (preg_match(self::JAVASCRIPT_PATTERN, $message)) {
            $reasons[] = 'JavaScript protocol is not allowed';
        }

        // Check for data: URLs
        if (preg_match(self::DATA_URL_PATTERN, $message)) {
            $reasons[] = 'Data URLs are not allowed';
        }

        // Check for event handlers (onclick, onerror, etc.)
        if (preg_match(self::EVENT_HANDLER_PATTERN, $message)) {
            $reasons[] = 'Event handlers are not allowed';
        }

        return [
            'hasForbidden' => !empty($reasons),
            'reasons' => $reasons,
        ];
    }

    /**
     * Sanitize a message by stripping all forbidden content
     *
     * Use this as a defense-in-depth measure. Primary validation should
     * use containsForbiddenContent() to reject messages outright.
     *
     * @param string $message The message to sanitize
     * @return string The sanitized message
     */
    public function sanitize(string $message): string
    {
        // Strip script tags completely
        $sanitized = preg_replace(self::SCRIPT_PATTERN, '', $message);

        // Strip all HTML tags
        $sanitized = strip_tags($sanitized);

        // Replace URLs with a placeholder
        $sanitized = preg_replace(self::URL_PATTERN, '[link removed]', $sanitized);

        // Remove javascript: protocol
        $sanitized = preg_replace(self::JAVASCRIPT_PATTERN, '', $sanitized);

        // Remove data: URLs
        $sanitized = preg_replace(self::DATA_URL_PATTERN, '', $sanitized);

        // Remove event handlers
        $sanitized = preg_replace(self::EVENT_HANDLER_PATTERN, '', $sanitized);

        // Trim and limit whitespace
        $sanitized = preg_replace('/\s+/', ' ', trim($sanitized));

        return $sanitized;
    }

    /**
     * Validate and sanitize a message for storage
     *
     * @param string $message The message to validate
     * @param int $senderId The ID of the sender (for logging)
     * @param int $appointmentId The appointment ID (for logging)
     * @return array Contains 'valid' boolean, 'message' string (sanitized or original), 'error' string if invalid
     */
    public function validateAndSanitize(string $message, int $senderId, int $appointmentId): array
    {
        $check = $this->containsForbiddenContent($message);

        if ($check['hasForbidden']) {
            Log::warning('MessageSanitization: Forbidden content detected', [
                'sender_id' => $senderId,
                'appointment_id' => $appointmentId,
                'reasons' => $check['reasons'],
                'message_preview' => substr($message, 0, 100) . (strlen($message) > 100 ? '...' : ''),
            ]);

            return [
                'valid' => false,
                'message' => null,
                'error' => 'Message contains content that is not allowed: ' . implode(', ', $check['reasons']),
                'reasons' => $check['reasons'],
            ];
        }

        // Even if no forbidden content detected, apply sanitization as defense-in-depth
        $sanitized = $this->sanitize($message);

        return [
            'valid' => true,
            'message' => $sanitized,
            'error' => null,
            'reasons' => [],
        ];
    }

    /**
     * Quick check if a message is safe (no forbidden content)
     *
     * @param string $message The message to check
     * @return bool True if message is safe, false otherwise
     */
    public function isSafe(string $message): bool
    {
        return !$this->containsForbiddenContent($message)['hasForbidden'];
    }
}
