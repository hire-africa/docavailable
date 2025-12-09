// OpenAI Configuration
// Use environment variables for API key in production

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-3.5-turbo',
  maxTokens: 800, // Increased for better, more complete responses
  temperature: 0.8, // Slightly higher for more natural, conversational responses
};

// Instructions to get your API key:
// 1. Go to https://platform.openai.com/
// 2. Sign up or log in
// 3. Go to API Keys section
// 4. Create a new API key
// 5. Set it as an environment variable: OPENAI_API_KEY=your_key_here
// 6. Keep your API key secure and never commit it to version control

// For development, you can use the hardcoded key above
// For production, always use environment variables 