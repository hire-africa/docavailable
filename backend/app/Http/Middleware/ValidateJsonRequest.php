<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateJsonRequest
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only apply to POST, PUT, PATCH requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            // Check if request has JSON content type
            if (!$request->isJson() && $request->header('Content-Type') !== 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Content-Type must be application/json',
                ], 400);
            }
            
            // Check if request body is valid JSON
            if ($request->getContent() && !$this->isValidJson($request->getContent())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid JSON format in request body',
                ], 400);
            }
        }
        
        return $next($request);
    }
    
    private function isValidJson($string) {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }
} 