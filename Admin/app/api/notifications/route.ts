import { NextRequest, NextResponse } from 'next/server';

// Mock notification storage - in real app, this would be a database
let notifications: any[] = [
  {
    id: '1',
    title: 'Welcome to DocAvailable Admin',
    message: 'You can now send notifications to users, doctors, and patients from this admin panel.',
    type: 'system',
    recipientType: 'all',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: false,
    sentBy: 'System'
  },
  {
    id: '2',
    title: 'System Maintenance Scheduled',
    message: 'The app will be under maintenance from 2:00 AM to 4:00 AM EST tomorrow.',
    type: 'system',
    recipientType: 'all',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
    sentBy: 'Admin'
  }
];

// CORS headers for mobile app access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType');
    const userId = searchParams.get('userId');
    const isAdmin = request.headers.get('authorization')?.includes('Bearer');

    // Filter notifications based on user type and ID
    let filteredNotifications = notifications;

    // If it's an admin request, return all notifications
    if (isAdmin) {
      filteredNotifications = notifications;
    } else if (userType) {
      filteredNotifications = notifications.filter(notification => {
        if (!notification.recipientType) return true;
        
        switch (notification.recipientType) {
          case 'all':
            return true;
          case 'doctors':
            return userType === 'doctor';
          case 'patients':
            return userType === 'patient';
          case 'specific':
            return notification.recipientId === userId;
          default:
            return true;
        }
      });
    }

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { 
    status: 200, 
    headers: corsHeaders 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, recipientType, recipientId, sentBy } = body;

    // Validate required fields
    if (!title || !message || !type || !recipientType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      recipientType,
      recipientId: recipientType === 'specific' ? recipientId : undefined,
      timestamp: new Date().toISOString(),
      isRead: false,
      sentBy: sentBy || 'Admin'
    };

    // Add to storage
    notifications.unshift(notification);

    // In a real app, this would also:
    // 1. Save to database
    // 2. Send push notifications
    // 3. Update user notification counts

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification sent successfully'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500, headers: corsHeaders }
    );
  }
}
