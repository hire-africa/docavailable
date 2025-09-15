# OpenAI API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the left sidebar
4. Click "Create new secret key"
5. Give it a name (e.g., "DocAvailable Chatbot")
6. Copy the generated API key (it starts with `sk-`)

### Step 2: Add Your API Key
1. Open `config/openai.ts`
2. Replace `'your-api-key-here'` with your actual API key:

```typescript
export const OPENAI_CONFIG = {
  apiKey: 'sk-your-actual-api-key-here', // Replace this
  model: 'gpt-3.5-turbo',
  maxTokens: 300,
  temperature: 0.7,
};
```

### Step 3: Test the Chatbot
1. Run your app
2. Go to the patient dashboard
3. Click the floating chat button
4. Ask a health question
5. You should get an intelligent response from GPT-3.5

## Security Best Practices

### For Development:
- Keep your API key in the config file (as shown above)
- Never commit the real API key to version control

### For Production:
1. Use environment variables:
```typescript
apiKey: process.env.OPENAI_API_KEY || 'fallback-key',
```

2. Add to your `.env` file:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

3. Add `.env` to your `.gitignore`:
```
.env
```

## Cost Information

- **GPT-3.5-turbo**: ~$0.002 per 1K tokens (very affordable)
- **Typical conversation**: 50-100 tokens per message
- **Estimated cost**: Less than $1 per 1000 conversations

## Troubleshooting

### "OpenAI API key not configured"
- Make sure you replaced `'your-api-key-here'` with your actual API key
- Check that the API key starts with `sk-`

### "OpenAI API error"
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you're not hitting rate limits

### Fallback System
If OpenAI fails, the chatbot automatically falls back to the keyword-based system, so it will always work.

## Advanced Configuration

### Change Model
```typescript
model: 'gpt-4', // More expensive but more capable
```

### Adjust Response Length
```typescript
maxTokens: 500, // Longer responses
```

### Control Creativity
```typescript
temperature: 0.3, // More focused responses (0.0 = very focused, 1.0 = very creative)
```

## Support

If you need help:
1. Check the [OpenAI API documentation](https://platform.openai.com/docs)
2. Verify your API key in the [OpenAI dashboard](https://platform.openai.com/api-keys)
3. Check your usage and billing in the [OpenAI dashboard](https://platform.openai.com/usage) 