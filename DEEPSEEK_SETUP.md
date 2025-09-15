# DeepSeek API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your DeepSeek API Key
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the left sidebar
4. Click "Create new secret key"
5. Give it a name (e.g., "DocAvailable Chatbot")
6. Copy the generated API key

### Step 2: Add Your API Key
1. Open `config/deepseek.ts`
2. Replace `'your-deepseek-api-key-here'` with your actual API key:

```typescript
export const DEEPSEEK_CONFIG = {
  apiKey: 'your-actual-deepseek-api-key-here', // Replace this
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 300,
  temperature: 0.7,
};
```

### Step 3: Test the Chatbot
1. Run your app
2. Go to the patient dashboard
3. Click the floating chat button
4. Ask a health question
5. You should get an intelligent response from DeepSeek

## Security Best Practices

### For Development:
- Keep your API key in the config file (as shown above)
- Never commit the real API key to version control

### For Production:
1. Use environment variables:
```typescript
apiKey: process.env.DEEPSEEK_API_KEY || 'fallback-key',
```

2. Add to your `.env` file:
```
DEEPSEEK_API_KEY=your-actual-deepseek-api-key-here
```

3. Add `.env` to your `.gitignore`:
```
.env
```

## Cost Information

- **DeepSeek Chat**: Competitive pricing with OpenAI
- **Typical conversation**: 50-100 tokens per message
- **Estimated cost**: Very affordable for healthcare applications

## Troubleshooting

### "DeepSeek API key not configured"
- Make sure you replaced `'your-deepseek-api-key-here'` with your actual API key
- Check that the API key is valid

### "DeepSeek API error"
- Verify your API key is correct
- Check your DeepSeek account has credits
- Ensure you're not hitting rate limits

### Fallback System
If DeepSeek fails, the chatbot automatically falls back to the keyword-based system, so it will always work.

## Advanced Configuration

### Change Model
```typescript
model: 'deepseek-coder', // For more technical responses
```

### Adjust Response Length
```typescript
maxTokens: 500, // Longer responses
```

### Control Creativity
```typescript
temperature: 0.3, // More focused responses (0.0 = very focused, 1.0 = very creative)
```

## Testing

Run the test script to verify your integration:

```bash
node scripts/development/test-deepseek.js
```

This will test various health-related questions and show you the responses from DeepSeek.

## Migration from OpenAI

The migration from OpenAI to DeepSeek has been completed with the following changes:

1. **New Configuration**: `config/deepseek.ts` replaces `config/openai.ts`
2. **New Service**: `services/deepseekService.ts` handles DeepSeek API calls
3. **Updated Chatbot**: `services/chatbotService.ts` now uses DeepSeek
4. **Backward Compatibility**: All existing interfaces remain the same
5. **Fallback System**: Keyword-based responses still work if API fails

## Support

If you need help:
1. Check the [DeepSeek API documentation](https://platform.deepseek.com/docs)
2. Verify your API key in the [DeepSeek dashboard](https://platform.deepseek.com/api-keys)
3. Check your usage and billing in the [DeepSeek dashboard](https://platform.deepseek.com/usage)
