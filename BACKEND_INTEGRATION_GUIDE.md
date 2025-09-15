# Backend Integration Guide

## Overview

This guide explains how to integrate your Firebase-based React Native frontend with the Laravel backend we've built. The integration is designed to be gradual and non-disruptive, allowing you to migrate features one at a time while maintaining full functionality.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Laravel API   │    │   Firebase      │
│   Frontend      │◄──►│   Backend       │    │   (Auth/Storage) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Current Setup
- **Authentication**: Firebase Auth (stays)
- **File Storage**: Firebase Storage (stays)
- **Real-time Features**: Firebase (stays for now)
- **Data Storage**: Migrating from Firestore to Laravel/MySQL
- **Push Notifications**: Migrating to Laravel backend

## Setup Instructions

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Laravel Backend Configuration
EXPO_PUBLIC_API_BASE_URL=http://172.20.10.11:8000/api
EXPO_PUBLIC_BACKEND_ENABLED=true

# Feature Flags (for gradual migration)
EXPO_PUBLIC_USE_BACKEND_CHAT=true
EXPO_PUBLIC_USE_BACKEND_WALLET=true
EXPO_PUBLIC_USE_BACKEND_NOTIFICATIONS=true
EXPO_PUBLIC_USE_BACKEND_APPOINTMENTS=false
```

### 2. Backend Setup

1. **Start Laravel Backend**:
   ```bash
   cd backend
   php artisan serve
   ```

2. **Run Migrations**:
   ```bash
   php artisan migrate
   ```

3. **Configure CORS** (if needed):
   Update `config/cors.php` to allow your frontend domain.

### 3. Firebase Authentication Integration

The Laravel backend uses Firebase JWT tokens for authentication. Ensure your Laravel backend is configured to validate Firebase tokens.

## Service Layer Architecture

### API Service (`services/apiService.ts`)
- Handles all HTTP requests to Laravel backend
- Automatic Firebase token injection
- Error handling and retry logic
- Request/response interceptors

### Feature-Specific Services

#### Chat Service (`services/chatApiService.ts`)
```typescript
// Get chat rooms
const response = await chatApiService.getChatRooms();

// Send message
const message = await chatApiService.sendMessage(roomId, {
  content: "Hello!",
  message_type: "text"
});

// Upload file
const fileMessage = await chatApiService.sendMessage(roomId, {
  content: "Check this file",
  message_type: "file",
  file: fileObject
});
```

#### Wallet Service (`services/walletApiService.ts`)
```typescript
// Get wallet info
const wallet = await walletApiService.getWallet();

// Get transactions
const transactions = await walletApiService.getTransactions(1, 20);

// Request withdrawal
const withdrawal = await walletApiService.requestWithdrawal({
  amount: 100,
  payment_method: "bank_transfer",
  payment_details: {
    account_number: "1234567890",
    bank_name: "Example Bank"
  }
});
```

#### Notification Service (`services/notificationApiService.ts`)
```typescript
// Get notifications
const notifications = await notificationApiService.getNotifications(1);

// Mark as read
await notificationApiService.markAsRead(notificationId);

// Update preferences
await notificationApiService.updatePreference("appointment", {
  email_enabled: true,
  push_enabled: true
});
```

### Hybrid Service (`services/hybridService.ts`)
Provides seamless switching between Firebase and Laravel backend:

```typescript
// Automatically uses backend or falls back to Firebase
const chatRooms = await hybridService.getChatRooms();
const wallet = await hybridService.getWallet();
const notifications = await hybridService.getNotifications();
```

## Migration Strategy

### Phase 1: Chat System (Complete)
- ✅ Backend API implemented
- ✅ Frontend service created
- ✅ Real-time messaging via WebSockets
- ✅ File uploads
- ✅ Message reactions and reads

### Phase 2: Wallet System (Complete)
- ✅ Backend API implemented
- ✅ Frontend service created
- ✅ Payment processing
- ✅ Withdrawal management
- ✅ Transaction history

### Phase 3: Notifications (Complete)
- ✅ Backend API implemented
- ✅ Frontend service created
- ✅ Push notification delivery
- ✅ Preference management

### Phase 4: Appointments (Future)
- ⏳ Migrate appointment data to Laravel
- ⏳ Update appointment management
- ⏳ Integrate with chat system

## Usage Examples

### 1. Chat Integration

```typescript
import { chatApiService } from '../services/chatApiService';

// In your chat component
const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      const response = await chatApiService.getChatRooms();
      if (response.success) {
        setRooms(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    }
  };

  const sendMessage = async (roomId: number, content: string) => {
    try {
      const response = await chatApiService.sendMessage(roomId, {
        content,
        message_type: 'text'
      });
      if (response.success) {
        // Message sent successfully
        // Real-time updates will come via WebSocket
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
};
```

### 2. Wallet Integration

```typescript
import { walletApiService } from '../services/walletApiService';

// In your wallet component
const WalletComponent = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        walletApiService.getWallet(),
        walletApiService.getTransactions()
      ]);

      if (walletResponse.success) {
        setWallet(walletResponse.data);
      }
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  };
};
```

### 3. Notification Integration

```typescript
import { notificationApiService } from '../services/notificationApiService';

// In your notification component
const NotificationComponent = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationApiService.getNotifications();
      if (response.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationApiService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };
};
```

## Error Handling

The API services include comprehensive error handling:

```typescript
try {
  const response = await chatApiService.getChatRooms();
  if (response.success) {
    // Handle success
  } else {
    // Handle API error
    console.error('API Error:', response.message);
  }
} catch (error) {
  // Handle network/connection errors
  console.error('Network Error:', error);
  
  // Check if backend is available
  const isBackendAvailable = await hybridService.isBackendAvailable();
  if (!isBackendAvailable) {
    // Fallback to Firebase or show offline message
  }
}
```

## Testing

### Backend Connectivity Test
```typescript
import { hybridService } from '../services/hybridService';

const testBackend = async () => {
  const isAvailable = await hybridService.isBackendAvailable();
  console.log('Backend available:', isAvailable);
};
```

### Feature Flag Management
```typescript
// Check current feature flags
const flags = hybridService.getFeatureFlags();
console.log('Using backend for chat:', flags.useBackendForChat);

// Update feature flags (for testing)
await hybridService.updateFeatureFlags({
  useBackendForChat: false // Fallback to Firebase
});
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Laravel CORS configuration allows your frontend domain
   - Check that `EXPO_PUBLIC_API_BASE_URL` is correct

2. **Authentication Errors**
   - Verify Firebase token is being sent correctly
   - Check Laravel Firebase authentication setup

3. **Connection Timeouts**
   - Verify backend is running on correct port
   - Check network connectivity

4. **Feature Flag Issues**
   - Ensure environment variables are set correctly
   - Check AsyncStorage for stored flags

### Debug Mode

Enable debug logging by setting:
```bash
EXPO_PUBLIC_DEBUG_MODE=true
```

This will log all API requests and responses to the console.

## Next Steps

1. **Test Integration**: Start with chat system integration
2. **Monitor Performance**: Compare Firebase vs Laravel performance
3. **Gradual Migration**: Move features one by one
4. **User Feedback**: Gather feedback on new features
5. **Optimization**: Optimize based on usage patterns

## Support

For issues or questions:
1. Check the Laravel backend logs
2. Review API response codes
3. Test with Postman/Insomnia
4. Check Firebase console for auth issues 