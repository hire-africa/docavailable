'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  DollarSign,
  User,
  Calendar,
  Phone,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WithdrawRequest {
  id: string;
  doctor_id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: 'pending' | 'completed' | 'failed';
  account_number?: string;
  bank_name?: string;
  account_holder_name?: string;
  mobile_provider?: string;
  mobile_number?: string;
  bank_branch?: string;
  rejection_reason?: string;
  approved_at?: string;
  paid_at?: string;
  approved_by?: string;
  paid_by?: string;
  created_at: string;
  updated_at: string;
  doctor: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Admin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
}

export default function WithdrawRequestsPage() {
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');

  useEffect(() => {
    fetchWithdrawRequests();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      console.log('Fetching admins with token:', token ? 'present' : 'missing');
      
      const response = await fetch('/api/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Admins API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admins data received:', data);
        setAdmins(data.admins);
      } else {
        const errorData = await response.json();
        console.error('Admins API error:', errorData);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchWithdrawRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/withdraw-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawRequests(data.withdrawRequests || []);
      } else {
        toast.error('Failed to fetch withdrawal requests');
      }
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast.error('Error fetching withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: 'completed' | 'failed') => {
    try {
      setProcessing(requestId);
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/withdraw-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          completed_by: newStatus === 'completed' ? selectedAdminId : null
        }),
      });

      if (response.ok) {
        toast.success(`Withdrawal request ${newStatus === 'completed' ? 'completed' : 'rejected'} successfully`);
        fetchWithdrawRequests();
        setShowModal(false);
        setSelectedRequest(null);
        setSelectedAdminId('');
      } else {
        toast.error('Failed to update withdrawal request status');
      }
    } catch (error) {
      console.error('Error updating withdrawal request:', error);
      toast.error('Error updating withdrawal request');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    // Default to MWK for now, you can modify this based on your needs
    const locale = 'en-MW';
    const currencyCode = 'MWK';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredRequests = withdrawRequests.filter(request => {
    const matchesSearch = 
      request.doctor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const openModal = (request: WithdrawRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CreditCard className="h-8 w-8 text-green-600 mr-3" />
              Withdrawal Requests
            </h1>
            <p className="text-gray-600 mt-1">Manage doctor withdrawal requests and payments</p>
          </div>
          <button
            onClick={fetchWithdrawRequests}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by doctor name, email, or request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {withdrawRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {withdrawRequests.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {withdrawRequests.filter(r => r.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Requests Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.doctor.first_name} {request.doctor.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{request.doctor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(request.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
                       request.payment_method === 'mobile_money' ? 'Mobile Money' : 
                       'Mzunguko'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.payment_method === 'bank_transfer' && (request.bank_name || request.payment_details?.bank_name || 'Bank Transfer')}
                      {request.payment_method === 'mobile_money' && 
                        `${request.mobile_provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openModal(request)}
                      className="text-green-600 hover:text-green-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No withdrawal requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No requests match your current filters.' 
                : 'No withdrawal requests have been submitted yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Withdrawal Request Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Doctor Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Doctor Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedRequest.doctor.first_name} {selectedRequest.doctor.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedRequest.doctor.email}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Amount</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Method: </span>
                      <span className="ml-1 font-medium">
                        {selectedRequest.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
                         selectedRequest.payment_method === 'mobile_money' ? 'Mobile Money' : 
                         'Mzunguko'}
                      </span>
                    </div>
                    
                    {selectedRequest.payment_method === 'bank_transfer' && (
                      <>
                        {(selectedRequest.bank_name || selectedRequest.payment_details?.bank_name) && (
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Bank: </span>
                            <span className="ml-1 font-medium">{selectedRequest.bank_name || selectedRequest.payment_details?.bank_name}</span>
                          </div>
                        )}
                        {selectedRequest.account_number && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Account: </span>
                            <span className="ml-1 font-medium">{selectedRequest.account_number}</span>
                          </div>
                        )}
                        {selectedRequest.bank_branch && (
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Branch: </span>
                            <span className="ml-1 font-medium">{selectedRequest.bank_branch}</span>
                          </div>
                        )}
                        {selectedRequest.account_holder_name && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Account Holder: </span>
                            <span className="ml-1 font-medium">{selectedRequest.account_holder_name}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedRequest.payment_method === 'mobile_money' && (
                      <>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Provider: </span>
                          <span className="ml-1 font-medium">
                            {(selectedRequest.mobile_provider || selectedRequest.payment_details?.mobile_provider) === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
                          </span>
                        </div>
                        {(selectedRequest.mobile_number || selectedRequest.payment_details?.mobile_number) && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Number: </span>
                            <span className="ml-1 font-medium">{selectedRequest.mobile_number || selectedRequest.payment_details?.mobile_number}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedRequest.payment_method === 'mzunguko' && (
                      <>
                        {selectedRequest.payment_details?.mzunguko_full_name && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Name: </span>
                            <span className="ml-1 font-medium">{selectedRequest.payment_details.mzunguko_full_name}</span>
                          </div>
                        )}
                        {selectedRequest.payment_details?.mzunguko_email && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Email: </span>
                            <span className="ml-1 font-medium">{selectedRequest.payment_details.mzunguko_email}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-1 capitalize">{selectedRequest.status}</span>
                  </span>
                </div>

                {/* Completed By Field */}
                {selectedRequest.status === 'pending' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Completed By</h4>
                    <select
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Select an admin...</option>
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.full_name} ({admin.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                {selectedRequest.status === 'pending' && (
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                      disabled={processing === selectedRequest.id || !selectedAdminId}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {processing === selectedRequest.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'failed')}
                      disabled={processing === selectedRequest.id}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {processing === selectedRequest.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
