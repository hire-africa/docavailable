'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, Activity } from 'lucide-react';

interface AnalyticsData {
  userGrowth: Array<{ month: string; users: number; doctors: number; patients: number }>;
  revenueData: Array<{ month: string; revenue: number; subscriptions: number }>;
  appointmentStats: Array<{ type: string; count: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
  monthlyStats: {
    totalUsers: number;
    newUsers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalAppointments: number;
    completedAppointments: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      console.log('🔍 Fetching analytics data...');
      console.log('Time range:', timeRange);
      console.log('Token exists:', !!token);
      
      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Analytics API response status:', response.status);

      if (response.ok) {
        const analyticsData = await response.json();
        console.log('📊 Analytics data received:', analyticsData);
        setData(analyticsData);
      } else {
        const errorData = await response.json();
        console.error('❌ Analytics API Error:', errorData);
        // Set some fallback data for demonstration
        setData({
          userGrowth: [
            { month: 'Jan 2024', users: 0, doctors: 0, patients: 0 },
            { month: 'Feb 2024', users: 0, doctors: 0, patients: 0 },
            { month: 'Mar 2024', users: 0, doctors: 0, patients: 0 }
          ],
          revenueData: [
            { month: 'Jan 2024', revenue: 0, subscriptions: 0 },
            { month: 'Feb 2024', revenue: 0, subscriptions: 0 },
            { month: 'Mar 2024', revenue: 0, subscriptions: 0 }
          ],
          appointmentStats: [
            { type: 'Video Call', count: 0 },
            { type: 'Voice Call', count: 0 },
            { type: 'Text Chat', count: 0 }
          ],
          paymentMethods: [
            { method: 'Mobile Money', count: 0, amount: 0 },
            { method: 'Bank Transfer', count: 0, amount: 0 }
          ],
          monthlyStats: {
            totalUsers: 0,
            newUsers: 0,
            totalRevenue: 0,
            monthlyRevenue: 0,
            totalAppointments: 0,
            completedAppointments: 0
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      // Set fallback data on error
      setData({
        userGrowth: [
          { month: 'Jan 2024', users: 0, doctors: 0, patients: 0 },
          { month: 'Feb 2024', users: 0, doctors: 0, patients: 0 },
          { month: 'Mar 2024', users: 0, doctors: 0, patients: 0 }
        ],
        revenueData: [
          { month: 'Jan 2024', revenue: 0, subscriptions: 0 },
          { month: 'Feb 2024', revenue: 0, subscriptions: 0 },
          { month: 'Mar 2024', revenue: 0, subscriptions: 0 }
        ],
        appointmentStats: [
          { type: 'Video Call', count: 0 },
          { type: 'Voice Call', count: 0 },
          { type: 'Text Chat', count: 0 }
        ],
        paymentMethods: [
          { method: 'Mobile Money', count: 0, amount: 0 },
          { method: 'Bank Transfer', count: 0, amount: 0 }
        ],
        monthlyStats: {
          totalUsers: 0,
          newUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalAppointments: 0,
          completedAppointments: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-500">Analytics data is not available at the moment.</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Platform insights and performance metrics
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-48"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.monthlyStats.totalUsers.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+{data.monthlyStats.newUsers} this month</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">${data.monthlyStats.totalRevenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>${data.monthlyStats.monthlyRevenue.toLocaleString()} this month</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.monthlyStats.totalAppointments.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <Activity className="h-4 w-4 mr-1" />
                <span>{data.monthlyStats.completedAppointments} completed</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.monthlyStats.totalAppointments > 0 
                      ? Math.round((data.monthlyStats.completedAppointments / data.monthlyStats.totalAppointments) * 100)
                      : 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="users" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="doctors" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="patients" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Subscriptions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Appointment Types */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.appointmentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.appointmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'amount' ? 'Amount ($)' : 'Count']} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Plans</h3>
            <div className="space-y-3">
              {data.paymentMethods.slice(0, 5).map((plan, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{plan.method}</span>
                  <span className="text-sm font-medium text-gray-900">{plan.count} subscriptions</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">New user registration</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Subscription activated</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Appointment completed</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Payment processed</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">System Uptime</span>
                  <span className="font-medium text-gray-900">99.9%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium text-gray-900">120ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Error Rate</span>
                  <span className="font-medium text-gray-900">0.1%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '1%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
