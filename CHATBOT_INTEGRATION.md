# Chatbot Integration

## Overview
The chatbot has been successfully integrated into the patient dashboard. It provides basic health guidance and encourages users to book appointments with real doctors for personal health concerns.

## Features
- **Floating Chat Button**: Always visible on the home tab
- **Smart Responses**: Keyword-based responses for common health questions
- **Appointment Guidance**: Directs users to book appointments when needed
- **Urgency Detection**: Identifies urgent symptoms and recommends immediate care
- **Professional Design**: Matches the app's aesthetic

## Current Implementation
The chatbot uses a simple keyword-based response system that:
- Recognizes common health symptoms and topics
- Provides appropriate guidance based on urgency
- Encourages booking appointments with real doctors
- Maintains a professional, caring tone

## How to Upgrade to OpenAI API

### 1. Get OpenAI API Key
- Sign up at https://platform.openai.com/
- Create an API key
- Add it to your environment variables

### 2. Install OpenAI Package
```bash
npm install openai
```

### 3. Update ChatbotService
Replace the `getResponse` method in `services/chatbotService.ts`:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ChatbotService {
  static async getResponse(userInput: string): Promise<ChatbotResponse> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userInput
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";
      
      // Determine if appointment booking is recommended
      const shouldBookAppointment = this.shouldRecommendAppointment(userInput, response);
      const urgency = this.determineUrgency(userInput);

      return {
        text: response,
        shouldBookAppointment,
        urgency
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to basic responses
      return this.getBasicResponse(userInput);
    }
  }

  private static shouldRecommendAppointment(userInput: string, response: string): boolean {
    const urgentKeywords = ['pain', 'symptom', 'fever', 'cough', 'headache', 'nausea'];
    return urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
  }

  private static determineUrgency(userInput: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['chest pain', 'shortness of breath', 'severe', 'bleeding'];
    const moderateKeywords = ['headache', 'fever', 'cough', 'fatigue'];
    
    if (urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'high';
    }
    if (moderateKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private static getBasicResponse(userInput: string): ChatbotResponse {
    // Fallback to current keyword-based system
    return this.getResponse(userInput);
  }
}
```

### 4. Environment Variables
Add to your `.env` file:
```
OPENAI_API_KEY=your_api_key_here
```

## Alternative: Dialogflow Integration

For more advanced conversational AI, consider Google Dialogflow:

### 1. Set up Dialogflow
- Create a Dialogflow project
- Design intents for health questions
- Train the bot with health-related conversations

### 2. Install Dialogflow Package
```bash
npm install @google-cloud/dialogflow
```

### 3. Update Service
```typescript
import dialogflow from '@google-cloud/dialogflow';

const sessionClient = new dialogflow.SessionsClient();
const projectId = 'your-project-id';
const sessionId = 'unique-session-id';

export class ChatbotService {
  static async getDialogflowResponse(userInput: string): Promise<ChatbotResponse> {
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
    
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userInput,
          languageCode: 'en-US',
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    
    return {
      text: result.fulfillmentText || "I'm sorry, I couldn't understand that.",
      shouldBookAppointment: result.intent?.displayName?.includes('appointment') || false,
      urgency: 'low'
    };
  }
}
```

## Testing the Chatbot

### Test Cases
1. **General Health Questions**: "What is a healthy diet?"
2. **Symptom Inquiries**: "I have a headache"
3. **Appointment Requests**: "How do I book an appointment?"
4. **Urgent Symptoms**: "I have chest pain"
5. **Greetings**: "Hello"

### Expected Behaviors
- General questions get informative responses
- Symptoms prompt appointment recommendations
- Urgent symptoms get immediate care recommendations
- Greetings get friendly, helpful responses

## Security Considerations
- Never store sensitive health information in chat logs
- Always recommend professional medical care for personal issues
- Include disclaimers about AI limitations
- Ensure HIPAA compliance if applicable

## Future Enhancements
- Voice input/output
- Image analysis for symptoms
- Integration with appointment booking
- Multi-language support
- Sentiment analysis for better responses 