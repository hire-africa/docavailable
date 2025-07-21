// OpenAI Configuration
// Use environment variables for API key in production

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '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',
  model: 'gpt-3.5-turbo',
  maxTokens: 300,
  temperature: 0.7,
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