'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, CreditCard, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  todayAppointments: number;
  todayRevenue: number;
  userGrowthPercentage: number;
  revenueGrowthPercentage: number;
  appointmentGrowthPercentage: number;
  subscriptionGrowthPercentage: number;
}

interface ChartData {
  name: string;
  value: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    todayAppointments: 0,
    todayRevenue: 0,
    userGrowthPercentage: 0,
    revenueGrowthPercentage: 0,
    appointmentGrowthPercentage: 0,
    subscriptionGrowthPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userGrowthData, setUserGrowthData] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      console.log('🔍 Fetching dashboard data...');
      console.log('Token exists:', !!token);
      
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dashboard data received:', data);
        console.log('📈 User Growth Data:', data.userGrowthData);
        console.log('💰 Revenue Data:', data.revenueData);
        console.log('📊 Subscription Data:', data.subscriptionData);
        setStats(data.stats);
        setUserGrowthData(data.userGrowthData || []);
        setRevenueData(data.revenueData || []);
        setSubscriptionData(data.subscriptionData || []);
        
        // If no data, show some sample data for demonstration
        if (!data.userGrowthData || data.userGrowthData.length === 0) {
          console.log('⚠️ No user growth data, using sample data');
          setUserGrowthData([
            { name: 'Week 1', value: 0 },
            { name: 'Week 2', value: 0 },
            { name: 'Week 3', value: 0 },
            { name: 'Week 4', value: 0 },
            { name: 'Week 5', value: 0 },
            { name: 'Week 6', value: 0 }
          ]);
        }
        
        if (!data.revenueData || data.revenueData.length === 0) {
          console.log('⚠️ No revenue data, using sample data');
          setRevenueData([
            { name: 'Week 1', value: 0 },
            { name: 'Week 2', value: 0 },
            { name: 'Week 3', value: 0 },
            { name: 'Week 4', value: 0 },
            { name: 'Week 5', value: 0 },
            { name: 'Week 6', value: 0 }
          ]);
        }
        
        if (!data.subscriptionData || data.subscriptionData.length === 0) {
          console.log('⚠️ No subscription data, using sample data');
          setSubscriptionData([
            { name: 'Basic Plan', value: 0 },
            { name: 'Premium Plan', value: 0 },
            { name: 'Pro Plan', value: 0 }
          ]);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        alert(`API Error: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      alert(`Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      change: `${stats.userGrowthPercentage >= 0 ? '+' : ''}${stats.userGrowthPercentage}%`,
      changeType: stats.userGrowthPercentage >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      name: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      change: `${stats.subscriptionGrowthPercentage >= 0 ? '+' : ''}${stats.subscriptionGrowthPercentage}%`,
      changeType: stats.subscriptionGrowthPercentage >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      name: 'Total Revenue',
      value: `MWK ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      change: `${stats.revenueGrowthPercentage >= 0 ? '+' : ''}${stats.revenueGrowthPercentage}%`,
      changeType: stats.revenueGrowthPercentage >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      name: 'Total Appointments',
      value: stats.totalAppointments,
      icon: Calendar,
      change: `${stats.appointmentGrowthPercentage >= 0 ? '+' : ''}${stats.appointmentGrowthPercentage}%`,
      changeType: stats.appointmentGrowthPercentage >= 0 ? 'positive' as const : 'negative' as const,
    },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of the Docavailable App
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <card.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className={`font-medium ${
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change}
                  </span>
                  <span className="text-gray-500"> from last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Today's Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Activity</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Appointments Today</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue Today</p>
                <p className="text-2xl font-semibold text-gray-900">MWK {stats.todayRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalAppointments > 0 
                    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth (Last 12 Weeks)</h3>
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No user growth data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Revenue (Last 12 Weeks)</h3>
            {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                <Tooltip formatter={(value) => [`MWK ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No revenue data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Subscription Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Distribution</h3>
            {subscriptionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No subscription data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">New doctor registered</p>
                  <p className="text-sm text-gray-500">Dr. John Smith joined the platform</p>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Subscription activated</p>
                  <p className="text-sm text-gray-500">Premium plan subscription for user #123</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Appointment scheduled</p>
                  <p className="text-sm text-gray-500">New appointment for tomorrow at 2 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
