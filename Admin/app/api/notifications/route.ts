import { NextRequest, NextResponse } from 'next/server';

// Notification storage - in real app, this would be a database
let notifications: any[] = [];

// Function to completely reset notifications (for development/testing)
function resetNotifications() {
  notifications = [];
  console.log('🔄 Notifications array reset to empty');
}

// Reset notifications on server start (for development)
resetNotifications();

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
    const forceClear = searchParams.get('forceClear') === 'true';

    // If forceClear is requested by admin, clear all notifications
    if (forceClear && isAdmin) {
      resetNotifications();
      return NextResponse.json({
        success: true,
        notifications: [],
        message: 'Notifications cleared successfully'
      }, { headers: corsHeaders });
    }

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

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = request.headers.get('authorization')?.includes('Bearer');
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Clear all notifications using reset function
    resetNotifications();

    return NextResponse.json({
      success: true,
      message: 'Notification history cleared successfully'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear notifications' },
      { status: 500, headers: corsHeaders }
    );
  }
}
