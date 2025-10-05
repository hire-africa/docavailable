'use client';

import Layout from '@/components/Layout';
import { CheckCircle, Eye, Filter, Search, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'doctor' | 'patient' | 'admin';
  status: string;
  created_at: string;
  is_active: boolean;
  rating?: number;
  total_ratings?: number;
}

interface UserDetails {
  user: User & {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    date_of_birth?: string;
    gender?: string;
    profile_picture?: string;
    bio?: string;
    last_login?: string;
    last_login_ip?: string;
    device_info?: string;
    user_agent?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    two_factor_enabled?: boolean;
    preferred_language?: string;
    timezone?: string;
    notification_preferences?: any;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    medical_license_number?: string;
    specialization?: string;
    years_of_experience?: number;
    hospital_affiliation?: string;
    consultation_fee?: number;
    availability_status?: string;
    is_online_for_instant_sessions?: boolean;
    google_id?: string;
    push_token?: string;
    account_age_days?: number;
  };
  currentSubscription?: {
    id: number;
    plan_id: number;
    plan_name: string;
    plan_price: string;
    plan_currency: string;
    status: number;
    is_active: boolean;
    start_date: string;
    end_date: string;
    text_sessions_remaining: number;
    appointments_remaining: number;
    voice_calls_remaining: number;
    video_calls_remaining: number;
    subscription_created_at: string;
    plan_display_name?: string;
    plan_description?: string;
    plan_features?: any;
    plan_limits?: any;
  };
  activityStats: {
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    total_payments: number;
    total_spent: number;
    total_reviews_received: number;
    total_reviews_given: number;
    total_subscriptions: number;
    active_subscriptions: number;
  };
  recentAppointments: Array<{
    id: number;
    appointment_date: string;
    appointment_time: string;
    status: string;
    type: string;
    notes?: string;
    created_at: string;
    user_role: string;
    other_party_name: string;
    other_party_email: string;
  }>;
  recentPayments: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    payment_gateway: string;
    transaction_id: string;
    created_at: string;
    description?: string;
  }>;
  deviceInfo: {
    last_login?: string;
    last_login_ip?: string;
    device_info?: string;
    user_agent?: string;
    account_created: string;
    hours_since_last_login: number;
    ip_type: string;
    security_flags: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [pendingDoctors, setPendingDoctors] = useState<User[]>([]);

  const itemsPerPage = 10;

  const fetchPendingDoctors = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/users?type=doctor&status=pending&limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingDoctors(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching pending doctors:', error);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      setLoadingDetails(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
      } else {
        toast.error('Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingDoctors();
  }, [currentPage, filterType, filterStatus, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      console.log('🔍 Fetching users...');
      console.log('Token exists:', !!token);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        type: filterType,
        status: filterStatus,
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Users API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Users data received:', data);
        setUsers(data.users);
        setTotalPages(data.totalPages);
      } else {
        const errorData = await response.json();
        console.error('❌ Users API Error:', errorData);
        toast.error(`Failed to fetch users: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('User status updated successfully');
        fetchUsers();
        fetchPendingDoctors(); // Refresh pending doctors list
      } else {
        toast.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      banned: 'bg-red-100 text-red-800',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const typeClasses = {
      doctor: 'bg-blue-100 text-blue-800',
      patient: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
    };
    return typeClasses[type as keyof typeof typeClasses] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage doctors, patients, and admin users
            </p>
          </div>
        </div>

        {/* Pending Doctors Alert */}
        {pendingDoctors.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {pendingDoctors.length} Doctor{pendingDoctors.length !== 1 ? 's' : ''} Awaiting Approval
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>The following doctors are pending approval and need your attention:</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFilterType('doctor');
                  setFilterStatus('pending');
                  setCurrentPage(1);
                }}
                className="ml-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
              >
                Review Now
              </button>
            </div>
            
            {/* Quick list of pending doctors */}
            <div className="mt-3 space-y-2">
              {pendingDoctors.slice(0, 3).map((doctor) => (
                <div key={doctor.id} className="flex items-center justify-between bg-white bg-opacity-50 rounded-md p-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-yellow-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-yellow-800">
                          {doctor.first_name?.charAt(0)}{doctor.last_name?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{doctor.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(doctor.id, 'approved')}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(doctor.id, 'rejected')}
                      className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingDoctors.length > 3 && (
                <p className="text-xs text-yellow-600 mt-2">
                  +{pendingDoctors.length - 3} more doctor{pendingDoctors.length - 3 !== 1 ? 's' : ''} pending approval
                </p>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input"
                >
                  <option value="all">All Types</option>
                  <option value="doctor">Doctors</option>
                  <option value="patient">Patients</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved/Active</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(user.user_type)}`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                        {user.user_type === 'doctor' && user.status === 'pending' && (
                          <span className="text-xs text-gray-500 mt-1">Awaiting approval</span>
                        )}
                        {user.user_type === 'patient' && user.status === 'approved' && (
                          <span className="text-xs text-gray-500 mt-1">Active by default</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.rating ? (
                        <div className="flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1">{Number(user.rating).toFixed(1)}</span>
                          <span className="text-gray-500 ml-1">({user.total_ratings || 0})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No ratings</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                            fetchUserDetails(user.id);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          {user.user_type === 'doctor' ? (
                            // Doctor-specific options
                            <>
                              <option value="pending">Pending</option>
                              <option value="approved">Approve</option>
                              <option value="rejected">Reject</option>
                              <option value="suspended">Suspend</option>
                              <option value="banned">Ban</option>
                            </>
                          ) : (
                            // Patient-specific options
                            <>
                              <option value="approved">Active</option>
                              <option value="suspended">Suspend</option>
                              <option value="banned">Ban</option>
                            </>
                          )}
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* User Details Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setUserDetails(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-8 w-8" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
                  </div>
                ) : userDetails ? (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Full Name</label>
                          <p className="text-sm text-gray-900">{userDetails.user.first_name} {userDetails.user.last_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-sm text-gray-900 flex items-center">
                            {userDetails.user.email}
                            {userDetails.user.email_verified ? (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 ml-2" />
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Country</label>
                          <p className="text-sm text-gray-900">{userDetails.user.country || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">User Type</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(userDetails.user.user_type)}`}>
                            {userDetails.user.user_type}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(userDetails.user.status)}`}>
                            {userDetails.user.status}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Account Age</label>
                          <p className="text-sm text-gray-900">{userDetails.user.account_age_days} days</p>
                        </div>
                        {userDetails.user.date_of_birth && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                            <p className="text-sm text-gray-900">{new Date(userDetails.user.date_of_birth).toLocaleDateString()}</p>
                          </div>
                        )}
                        {userDetails.user.gender && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Gender</label>
                            <p className="text-sm text-gray-900 capitalize">{userDetails.user.gender}</p>
                          </div>
                        )}
                        {userDetails.user.rating && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Rating</label>
                            <div className="flex items-center">
                              <span className="text-yellow-400">★</span>
                              <span className="ml-1">{Number(userDetails.user.rating).toFixed(1)}</span>
                              <span className="text-gray-500 ml-1">({userDetails.user.total_ratings || 0})</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Doctor-specific Information */}
                    {userDetails.user.user_type === 'doctor' && (
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userDetails.user.medical_license_number && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Medical License</label>
                              <p className="text-sm text-gray-900">{userDetails.user.medical_license_number}</p>
                            </div>
                          )}
                          {userDetails.user.specialization && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Specialization</label>
                              <p className="text-sm text-gray-900">{userDetails.user.specialization}</p>
                            </div>
                          )}
                          {userDetails.user.years_of_experience && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Experience</label>
                              <p className="text-sm text-gray-900">{userDetails.user.years_of_experience} years</p>
                            </div>
                          )}
                          {userDetails.user.hospital_affiliation && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Hospital Affiliation</label>
                              <p className="text-sm text-gray-900">{userDetails.user.hospital_affiliation}</p>
                            </div>
                          )}
                          {userDetails.user.consultation_fee && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Consultation Fee</label>
                              <p className="text-sm text-gray-900">${userDetails.user.consultation_fee}</p>
                            </div>
                          )}
                          {userDetails.user.availability_status && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Availability</label>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userDetails.user.availability_status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {userDetails.user.availability_status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Current Subscription */}
                    {userDetails.currentSubscription && (
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Plan</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.plan_display_name || userDetails.currentSubscription.plan_name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Price</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.plan_currency} {userDetails.currentSubscription.plan_price}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userDetails.currentSubscription.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {userDetails.currentSubscription.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">End Date</label>
                            <p className="text-sm text-gray-900">{new Date(userDetails.currentSubscription.end_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Text Sessions</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.text_sessions_remaining}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Appointments</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.appointments_remaining}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Voice Calls</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.voice_calls_remaining}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Video Calls</label>
                            <p className="text-sm text-gray-900">{userDetails.currentSubscription.video_calls_remaining}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Activity Statistics */}
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{userDetails.activityStats.total_appointments}</p>
                          <p className="text-sm text-gray-500">Total Appointments</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{userDetails.activityStats.completed_appointments}</p>
                          <p className="text-sm text-gray-500">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{userDetails.activityStats.cancelled_appointments}</p>
                          <p className="text-sm text-gray-500">Cancelled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{userDetails.activityStats.total_payments}</p>
                          <p className="text-sm text-gray-500">Total Payments</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">${userDetails.activityStats.total_spent}</p>
                          <p className="text-sm text-gray-500">Total Spent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{userDetails.activityStats.total_reviews_received}</p>
                          <p className="text-sm text-gray-500">Reviews Received</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{userDetails.activityStats.total_reviews_given}</p>
                          <p className="text-sm text-gray-500">Reviews Given</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-indigo-600">{userDetails.activityStats.active_subscriptions}</p>
                          <p className="text-sm text-gray-500">Active Subscriptions</p>
                        </div>
                      </div>
                    </div>

                    {/* Device & Security Information */}
                    <div className="bg-red-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Device & Security Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Login</label>
                          <p className="text-sm text-gray-900">
                            {userDetails.deviceInfo.last_login ? new Date(userDetails.deviceInfo.last_login).toLocaleString() : 'Never'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Online Status</label>
                          <p className="text-sm text-gray-900">
                            {userDetails.user.is_online_for_instant_sessions ? 'Online' : 'Offline'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Account Status</label>
                          <p className="text-sm text-gray-900">
                            {userDetails.user.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Hours Since Last Login</label>
                          <p className="text-sm text-gray-900">{Math.round(userDetails.deviceInfo.hours_since_last_login)} hours</p>
                        </div>
                        {userDetails.user.google_id && (
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">Google ID</label>
                            <p className="text-sm text-gray-900 break-all">{userDetails.user.google_id}</p>
                          </div>
                        )}
                        {userDetails.user.push_token && (
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">Push Token</label>
                            <p className="text-sm text-gray-900 break-all">{userDetails.user.push_token.substring(0, 50)}...</p>
                          </div>
                        )}
                      </div>

                      {/* Security Flags */}
                      {userDetails.deviceInfo.security_flags.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-md font-semibold text-gray-900 mb-2">Security Flags</h5>
                          <div className="space-y-2">
                            {userDetails.deviceInfo.security_flags.map((flag, index) => (
                              <div key={index} className={`p-3 rounded-md ${
                                flag.severity === 'high' ? 'bg-red-100 border-l-4 border-red-500' :
                                flag.severity === 'medium' ? 'bg-yellow-100 border-l-4 border-yellow-500' :
                                'bg-blue-100 border-l-4 border-blue-500'
                              }`}>
                                <p className={`text-sm font-medium ${
                                  flag.severity === 'high' ? 'text-red-800' :
                                  flag.severity === 'medium' ? 'text-yellow-800' :
                                  'text-blue-800'
                                }`}>
                                  {flag.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Recent Appointments */}
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Appointments</h4>
                        {userDetails.recentAppointments.length > 0 ? (
                          <div className="space-y-3">
                            {userDetails.recentAppointments.map((appointment) => (
                              <div key={appointment.id} className="border-l-4 border-blue-500 pl-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {appointment.user_role === 'patient' ? 'With Dr.' : 'Patient:'} {appointment.other_party_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{appointment.type}</p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {appointment.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No recent appointments</p>
                        )}
                      </div>

                      {/* Recent Payments */}
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h4>
                        {userDetails.recentPayments.length > 0 ? (
                          <div className="space-y-3">
                            {userDetails.recentPayments.map((payment) => (
                              <div key={payment.id} className="border-l-4 border-green-500 pl-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {payment.currency} {payment.amount}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(payment.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-500">{payment.payment_method}</p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No recent payments</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Failed to load user details</p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setUserDetails(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Close
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
