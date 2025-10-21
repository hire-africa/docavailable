'use client';

import Layout from '@/components/Layout';
import {
    AlertTriangle,
    Bell,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Heart,
    History,
    Info,
    MessageSquare,
    Plus,
    Send,
    Shield,
    User,
    UserCheck,
    UserCircle,
    Users,
    Video,
    Wrench,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: 'appointment' | 'message' | 'payment' | 'general' | 'reminder' | 'alert' | 'info' | 'success' | 'health' | 'security';
  recipientType: 'all' | 'doctors' | 'patients' | 'specific';
  recipientId?: string;
  sentAt: Date;
  sentBy: string;
}

const NOTIFICATION_ICONS = [
  { name: 'bell', label: 'General', type: 'general', icon: Bell },
  { name: 'calendar', label: 'Appointment', type: 'appointment', icon: Calendar },
  { name: 'message', label: 'Message', type: 'message', icon: MessageSquare },
  { name: 'dollar-sign', label: 'Payment', type: 'payment', icon: DollarSign },
  { name: 'clock', label: 'Reminder', type: 'reminder', icon: Clock },
  { name: 'alert', label: 'Alert', type: 'alert', icon: AlertTriangle },
  { name: 'info', label: 'Info', type: 'info', icon: Info },
  { name: 'success', label: 'Success', type: 'success', icon: CheckCircle },
  { name: 'health', label: 'Health', type: 'health', icon: Heart },
  { name: 'security', label: 'Security', type: 'security', icon: Shield }
];

const RECIPIENT_TYPES = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'doctors', label: 'Doctors Only', icon: UserCheck },
  { value: 'patients', label: 'Patients Only', icon: User },
  { value: 'specific', label: 'Specific User', icon: UserCircle }
];

export default function CommunicationsPage() {
  const [notifications, setNotifications] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [selectedIcon, setSelectedIcon] = useState(NOTIFICATION_ICONS[0]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'doctors' | 'patients' | 'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadNotificationHistory();
  }, []);

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      
      // Get admin token
      const token = localStorage.getItem('admin_token');
      if (!token) {
        console.error('No admin token found');
        return;
      }

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Convert API notifications to template format
          const templateNotifications: NotificationTemplate[] = data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            icon: getIconNameFromType(n.type),
            type: n.type,
            recipientType: n.recipientType,
            recipientId: n.recipientId,
            sentAt: new Date(n.timestamp),
            sentBy: n.sentBy
          }));
          setNotifications(templateNotifications);
        } else {
          console.error('API returned error:', data.error);
          setNotifications([]);
        }
      } else {
        console.error('Failed to load notifications, status:', response.status);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (recipientType === 'specific' && !specificUserId.trim()) {
      toast.error('Please enter a specific user ID.');
      return;
    }

    try {
      setSending(true);
      
      // Get admin token
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('Admin authentication required');
        return;
      }

      // Send to API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type: selectedIcon.type,
          recipientType,
          recipientId: recipientType === 'specific' ? specificUserId.trim() : undefined,
          sentBy: 'Admin'
        }),
      });

       if (response.ok) {
         const data = await response.json();
         if (data.success) {
           // Reset form
           setTitle('');
           setMessage('');
           setSpecificUserId('');
           setShowForm(false);
           
           // Reload notifications to show the new one
           await loadNotificationHistory();
           
           toast.success('Notification sent successfully!');
         } else {
           toast.error(data.error || 'Failed to send notification');
         }
       } else {
         const errorData = await response.json();
         toast.error(errorData.error || 'Failed to send notification');
       }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getRecipientLabel = (type: string) => {
    return RECIPIENT_TYPES.find(r => r.value === type)?.label || type;
  };

  const getIconNameFromType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'system': 'bell',
      'appointment': 'calendar',
      'message': 'message',
      'payment': 'dollar-sign',
      'reminder': 'clock'
    };
    return typeMap[type] || 'bell';
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'bell': Bell,
      'calendar': Calendar,
      'message': MessageSquare,
      'dollar-sign': DollarSign,
      'clock': Clock,
      'alert': AlertTriangle,
      'info': Info,
      'success': CheckCircle,
      'health': Heart,
      'security': Shield,
      'wrench': Wrench,
      'video': Video
    };
    return iconMap[iconName] || Bell;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Communications
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Send notifications to users, doctors, or specific individuals
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => loadNotificationHistory()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <History className="h-4 w-4 mr-2" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </button>
          </div>
        </div>

       {/* Main Content - Show all notifications */}
       <div className="bg-white shadow overflow-hidden sm:rounded-md">
         <div className="px-4 py-5 sm:px-6">
           <h3 className="text-lg leading-6 font-medium text-gray-900">
             Notification History
           </h3>
           <p className="mt-1 max-w-2xl text-sm text-gray-500">
             All notifications sent from this admin panel
           </p>
         </div>
         {loading ? (
           <div className="flex items-center justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
             <span className="ml-2 text-gray-500">Loading notifications...</span>
           </div>
         ) : notifications.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => {
              const IconComponent = getIconComponent(notification.icon);
              return (
                <li key={notification.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {getRecipientLabel(notification.recipientType)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Sent by {notification.sentBy} • {formatTimeAgo(notification.sentAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications sent</h3>
            <p className="mt-1 text-sm text-gray-500">Send your first notification to get started.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Send Notification
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send Notification</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Notification Icon</label>
                <div className="grid grid-cols-5 gap-3">
                  {NOTIFICATION_ICONS.map((icon) => {
                    const IconComponent = icon.icon;
                    return (
                      <button
                        key={icon.name}
                        onClick={() => setSelectedIcon(icon)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          selectedIcon.name === icon.name
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent className={`h-6 w-6 mx-auto ${
                          selectedIcon.name === icon.name ? 'text-green-600' : 'text-gray-600'
                        }`} />
                        <p className={`text-xs mt-1 ${
                          selectedIcon.name === icon.name ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {icon.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Send To</label>
                <div className="grid grid-cols-2 gap-3">
                  {RECIPIENT_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setRecipientType(type.value as any)}
                        className={`p-3 rounded-lg border-2 transition-colors flex items-center ${
                          recipientType === type.value
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent className={`h-5 w-5 mr-2 ${
                          recipientType === type.value ? 'text-green-600' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm ${
                          recipientType === type.value ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific User ID */}
              {recipientType === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                  <input
                    type="text"
                    value={specificUserId}
                    onChange={(e) => setSpecificUserId(e.target.value)}
                    placeholder="Enter user ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter notification message"
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={sending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
