# Admin Connection Test

## 🔗 **Testing Admin API Connection**

### **1. Test Admin API Endpoint**
Open your browser and go to:
```
https://docavailable.com/api/notifications?userType=patient&userId=test
```

**Expected Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "1",
      "title": "System Maintenance",
      "message": "The app will be under maintenance...",
      "type": "system",
      "recipientType": "all",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "isRead": false,
      "sentBy": "Admin"
    }
  ]
}
```

### **2. Test Mobile App Connection**
1. Open mobile app notifications page
2. Check console logs for:
   ```
   🔔 Fetching admin notifications from docavailable.com...
   🔔 Admin API response status: 200
   🔔 Admin API response data: {...}
   🔔 Admin notifications loaded: 1 [...]
   ```

### **3. Test Admin Panel**
1. Go to https://docavailable.com
2. Login to admin panel
3. Go to Communications page
4. Send a test notification
5. Check mobile app for the notification

### **4. Expected Flow**

#### **Admin Sends Notification:**
1. Admin fills form on Communications page
2. Clicks "Send Notification"
3. Notification sent to `/api/notifications` (POST)
4. Stored in admin database

#### **Mobile App Receives Notification:**
1. Mobile app calls `https://docavailable.com/api/notifications` (GET)
2. Fetches notifications filtered by user type
3. Combines with automated notifications
4. Displays in notification page

### **5. Debug Steps**

#### **If Admin API Not Working:**
- Check if admin server is running
- Check CORS settings
- Check authentication

#### **If Mobile App Not Receiving:**
- Check console logs
- Check network requests
- Check API response format

#### **If Notifications Not Displaying:**
- Check notification format
- Check filtering logic
- Check deduplication

### **6. CORS Configuration**
The admin API might need CORS headers:
```javascript
// In Admin/app/api/notifications/route.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
```

### **7. Test Commands**

#### **Test API Directly:**
```bash
curl -X GET "https://docavailable.com/api/notifications?userType=patient&userId=test"
```

#### **Test with Authentication:**
```bash
curl -X GET "https://docavailable.com/api/notifications?userType=patient&userId=test" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **8. Success Indicators**
- ✅ Admin API returns 200 status
- ✅ Mobile app receives notifications
- ✅ Notifications display correctly
- ✅ No CORS errors
- ✅ Console logs show successful fetch

The connection should now work with the correct `docavailable.com` URL!
