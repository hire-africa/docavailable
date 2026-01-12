<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Services\PromptLimitService;

class ChatbotController extends Controller
{
    private $openaiApiKey;
    private $openaiBaseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        // Try multiple ways to get the API key
        $this->openaiApiKey = env('OPENAI_API_KEY') ?: config('app.openai_api_key') ?: $_ENV['OPENAI_API_KEY'] ?? null;

        // Debug logging
        \Log::info('ChatbotController initialized', [
            'has_openai_key' => !empty($this->openaiApiKey),
            'key_length' => $this->openaiApiKey ? strlen($this->openaiApiKey) : 0,
            'key_starts_with_sk' => $this->openaiApiKey ? str_starts_with($this->openaiApiKey, 'sk-') : false,
            'env_method' => 'env()',
            'config_method' => 'config()',
            'server_method' => '$_ENV'
        ]);
    }

    /**
     * Get AI response for chatbot
     */
    public function getResponse(Request $request): JsonResponse
    {
        try {
            $userInput = $request->input('message');
            $userId = $request->input('user_id', 'default');
            $userContext = $request->input('context', []);

            if (empty($userInput)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Message is required'
                ], 400);
            }

            // Check prompt limit for authenticated users
            if ($userId !== 'default' && is_numeric($userId)) {
                $canMakePrompt = PromptLimitService::canMakePrompt((int) $userId);
                if (!$canMakePrompt) {
                    $limitStatus = PromptLimitService::getPromptLimitStatus((int) $userId);
                    return response()->json([
                        'success' => false,
                        'message' => 'Daily prompt limit reached',
                        'data' => [
                            'limit_reached' => true,
                            'remaining' => $limitStatus['remaining'],
                            'total' => $limitStatus['total'],
                            'reset_time' => $limitStatus['reset_time']
                        ]
                    ], 429);
                }
            }

            // Check if OpenAI API key is configured
            if (empty($this->openaiApiKey)) {
                Log::warning('OpenAI API key not configured, using fallback response', [
                    'user_input' => $userInput,
                    'api_key_empty' => empty($this->openaiApiKey)
                ]);
                return response()->json([
                    'success' => true,
                    'data' => $this->getFallbackResponse($userInput)
                ]);
            }

            Log::info('OpenAI API key found, proceeding with AI response', [
                'user_input' => $userInput,
                'key_length' => strlen($this->openaiApiKey)
            ]);

            // Get AI response from OpenAI
            $response = $this->getOpenAIResponse($userInput, $userContext, $userId);

            // Record prompt usage for authenticated users
            if ($userId !== 'default' && is_numeric($userId)) {
                $limitStatus = PromptLimitService::recordPromptUsage((int) $userId);
                $response['prompt_limit_status'] = $limitStatus;
            }

            return response()->json([
                'success' => true,
                'data' => $response
            ]);

        } catch (\Exception $e) {
            Log::error('Chatbot error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error generating response',
                'data' => $this->getFallbackResponse($request->input('message', ''))
            ], 500);
        }
    }

    /**
     * Get streaming AI response for chatbot
     */
    public function getStreamingResponse(Request $request): JsonResponse
    {
        try {
            $userInput = $request->input('message');
            $userId = $request->input('user_id', 'default');
            $userContext = $request->input('context', []);

            if (empty($userInput)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Message is required'
                ], 400);
            }

            // Check if OpenAI API key is configured
            if (empty($this->openaiApiKey)) {
                Log::warning('OpenAI API key not configured, using fallback response');
                return response()->json([
                    'success' => true,
                    'data' => $this->getFallbackResponse($userInput)
                ]);
            }

            // For now, return non-streaming response
            // TODO: Implement actual streaming
            $response = $this->getOpenAIResponse($userInput, $userContext, $userId);

            return response()->json([
                'success' => true,
                'data' => $response
            ]);

        } catch (\Exception $e) {
            Log::error('Chatbot streaming error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error generating streaming response',
                'data' => $this->getFallbackResponse($request->input('message', ''))
            ], 500);
        }
    }

    /**
     * Get OpenAI response
     */
    private function getOpenAIResponse(string $userInput, array $userContext = [], string $userId = 'default'): array
    {
        Log::info('Attempting OpenAI API call', [
            'user_input' => $userInput,
            'api_key_length' => strlen($this->openaiApiKey),
            'api_key_starts_with_sk' => str_starts_with($this->openaiApiKey, 'sk-')
        ]);

        $systemPrompt = "You are DocBot, a professional AI health assistant for DocAvailable, a telemedicine platform. Your role is to provide DIRECT, helpful health guidance without excessive questioning.

**CRITICAL RULE - NO EXCESSIVE QUESTIONS:**
- DO NOT ask multiple clarifying questions
- DO NOT reply multiple times asking for more details
- Give DIRECT, actionable advice based on what the user tells you
- If you truly need ONE piece of critical info, ask ONE brief question AT MOST
- NEVER ask more than one question per response
- Users get frustrated when asked repeated questions - be helpful, not interrogative

**Response Structure for Health Questions:**
1. **Brief Acknowledgment (1 sentence):** Show you understand their concern
2. **Direct Advice (3-5 sentences):** Provide practical, actionable guidance
3. **Doctor Recommendation (1 sentence):** Suggest when/if to see a specialist

**Keep Responses Concise:**
- Maximum 4-6 sentences total
- No long paragraphs or walls of text
- Focus on the most important advice
- Be conversational, not clinical

**Doctor Specialization Recommendations:**
- General symptoms: General Practitioner or Family Medicine
- Heart/chest issues: Cardiologist
- Neurological symptoms: Neurologist
- Skin conditions: Dermatologist
- Eye problems: Ophthalmologist
- Mental health: Psychiatrist or Psychologist
- Women's health: Gynecologist
- Children's health: Pediatrician
- Bone/joint issues: Orthopedist
- Digestive issues: Gastroenterologist

**Professional Guidelines:**
- Be helpful, empathetic, and to-the-point
- For urgent symptoms (chest pain, severe bleeding), strongly recommend immediate medical attention
- For general health questions, give brief educational content with practical advice
- Avoid medical jargon - speak in plain language

**Medical Disclaimer (brief):**
- Briefly mention you're an AI assistant, not a doctor
- Recommend seeing a healthcare professional for proper diagnosis

Remember: Be HELPFUL and DIRECT. Do not ask multiple questions or require users to explain repeatedly.";

        $messages = [
            [
                'role' => 'system',
                'content' => $systemPrompt
            ],
            [
                'role' => 'user',
                'content' => $userInput
            ]
        ];

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->openaiApiKey,
            'Content-Type' => 'application/json',
        ])->timeout(30)->post($this->openaiBaseUrl . '/chat/completions', [
                    'model' => 'gpt-3.5-turbo',
                    'messages' => $messages,
                    'max_tokens' => 300,
                    'temperature' => 0.6,
                ]);

        Log::info('OpenAI API request completed', [
            'status_code' => $response->status(),
            'successful' => $response->successful(),
            'response_size' => strlen($response->body())
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $aiResponse = $data['choices'][0]['message']['content'] ?? 'I apologize, but I could not generate a response.';

            Log::info('OpenAI API call successful', [
                'response_length' => strlen($aiResponse),
                'response_preview' => substr($aiResponse, 0, 100) . '...'
            ]);

            // Analyze response for booking recommendation and urgency
            $shouldBookAppointment = $this->shouldRecommendBooking($userInput, $aiResponse);
            $urgency = $this->determineUrgency($userInput);

            return [
                'text' => $aiResponse,
                'shouldBookAppointment' => $shouldBookAppointment,
                'urgency' => $urgency,
                'confidence' => 0.9,
                'suggestions' => $this->generateSuggestions($userInput, $aiResponse)
            ];
        } else {
            Log::error('OpenAI API error', [
                'status_code' => $response->status(),
                'response_body' => $response->body(),
                'user_input' => $userInput
            ]);
            return $this->getFallbackResponse($userInput);
        }
    }

    /**
     * Test method to check OpenAI API key configuration
     */
    public function testConfig(): JsonResponse
    {
        return response()->json([
            'openai_key_exists' => !empty($this->openaiApiKey),
            'openai_key_length' => $this->openaiApiKey ? strlen($this->openaiApiKey) : 0,
            'openai_key_starts_with_sk' => $this->openaiApiKey ? str_starts_with($this->openaiApiKey, 'sk-') : false,
            'openai_key_preview' => $this->openaiApiKey ? substr($this->openaiApiKey, 0, 10) . '...' : 'not set',
            'env_openai_key' => env('OPENAI_API_KEY') ? substr(env('OPENAI_API_KEY'), 0, 10) . '...' : 'not set',
            'server_env_openai_key' => isset($_ENV['OPENAI_API_KEY']) ? substr($_ENV['OPENAI_API_KEY'], 0, 10) . '...' : 'not set'
        ]);
    }

    /**
     * Get fallback response when OpenAI is not available
     */
    private function getFallbackResponse(string $userInput): array
    {
        $input = strtolower($userInput);

        // Basic keyword-based responses
        if (strpos($input, 'hello') !== false || strpos($input, 'hi') !== false) {
            return [
                'text' => 'Hello! I\'m DocBot, your health assistant. How can I help you today? For personalized medical advice, I recommend booking an appointment with one of our doctors.',
                'shouldBookAppointment' => true,
                'urgency' => 'low',
                'confidence' => 0.7,
                'suggestions' => ['Book an appointment', 'Ask about symptoms', 'Get health tips']
            ];
        }

        if (strpos($input, 'pain') !== false || strpos($input, 'hurt') !== false) {
            return [
                'text' => 'I understand you\'re experiencing pain. While I can provide general information, it\'s important to consult with a healthcare professional for proper evaluation. Would you like to book an appointment with one of our doctors?',
                'shouldBookAppointment' => true,
                'urgency' => 'medium',
                'confidence' => 0.8,
                'suggestions' => ['Book an appointment', 'Describe your symptoms', 'Emergency care']
            ];
        }

        if (strpos($input, 'emergency') !== false || strpos($input, 'urgent') !== false) {
            return [
                'text' => 'If this is a medical emergency, please call 911 or go to the nearest emergency room immediately. For non-emergency concerns, you can book an appointment with our doctors.',
                'shouldBookAppointment' => false,
                'urgency' => 'high',
                'confidence' => 0.9,
                'suggestions' => ['Call 911', 'Book urgent appointment', 'Find emergency room']
            ];
        }

        // Default response
        return [
            'text' => 'Thank you for your message. I\'m here to help with general health questions. When you consult with a healthcare provider about your concerns, be prepared to discuss: the specific nature and duration of your symptoms, any triggers or factors that affect your condition, your medical history and current medications, how the issue impacts your daily life, and any questions you have about treatment options. This detailed information will help your doctor provide the most accurate assessment and personalized care.',
            'shouldBookAppointment' => true,
            'urgency' => 'low',
            'confidence' => 0.6,
            'suggestions' => ['Book an appointment', 'Ask a question', 'Get health information']
        ];
    }

    /**
     * Determine if response should recommend booking an appointment
     */
    private function shouldRecommendBooking(string $userInput, string $aiResponse): bool
    {
        $keywords = ['appointment', 'book', 'schedule', 'consultation', 'doctor', 'medical'];
        $text = strtolower($userInput . ' ' . $aiResponse);

        foreach ($keywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine urgency level
     */
    private function determineUrgency(string $userInput): string
    {
        $urgentKeywords = ['emergency', 'urgent', 'severe', 'critical', 'immediately', '911'];
        $text = strtolower($userInput);

        foreach ($urgentKeywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return 'high';
            }
        }

        $mediumKeywords = ['pain', 'hurt', 'sick', 'fever', 'symptom'];
        foreach ($mediumKeywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return 'medium';
            }
        }

        return 'low';
    }

    /**
     * Generate suggestions based on input and response
     */
    private function generateSuggestions(string $userInput, string $aiResponse): array
    {
        $suggestions = [];

        if (strpos(strtolower($userInput), 'pain') !== false) {
            $suggestions[] = 'Describe your pain in detail';
        }

        if (strpos(strtolower($aiResponse), 'appointment') !== false) {
            $suggestions[] = 'Book an appointment';
        }

        if (strpos(strtolower($userInput), 'symptom') !== false) {
            $suggestions[] = 'Track your symptoms';
        }

        $suggestions[] = 'Ask another question';
        $suggestions[] = 'Get health tips';

        return array_slice($suggestions, 0, 3);
    }
}

