<?php

namespace App\Traits;

trait HandlesPhoneNormalization
{
    /**
     * Normalize phone number to consistent E.164 format.
     * Specifically handles Malawi (+265) leading zero issues.
     */
    protected function normalizePhoneNumber($phone)
    {
        if (empty($phone)) {
            return $phone;
        }

        // Remove any whitespace or dashes
        $phone = str_replace([' ', '-', '(', ')'], '', $phone);

        // Handle +2650... -> +265...
        if (str_starts_with($phone, '+2650')) {
            return '+265' . substr($phone, 5);
        }

        // Handle 2650... -> +265...
        if (str_starts_with($phone, '2650')) {
            return '+265' . substr($phone, 4);
        }

        // Handle 0... (local Malawi) -> +265...
        if (str_starts_with($phone, '0') && strlen($phone) === 10) {
            return '+265' . substr($phone, 1);
        }

        // If it starts with 265 but no +, add +
        if (str_starts_with($phone, '265') && !str_starts_with($phone, '+')) {
            return '+' . $phone;
        }

        return $phone;
    }
}
