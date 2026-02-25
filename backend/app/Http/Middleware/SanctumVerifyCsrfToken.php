<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as Middleware;

/**
 * CSRF verification for Sanctum stateful requests.
 * Exempts API routes so token-based clients (mobile, web with Bearer) and
 * same-origin POSTs (e.g. login, version-check) work without a prior
 * /sanctum/csrf-cookie call.
 */
class SanctumVerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     * API routes use token auth or are public; exempting avoids 419 on login/version-check.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/*',
    ];
}
