'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Search, Filter, UserCheck, CheckCircle, XCircle, Eye, Clock, Star, Mail, Phone, MapPin, Calendar, User, Shield, GraduationCap, Building, DollarSign, Globe, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  status: string;
  created_at: string;
  is_active: boolean;
  rating: number;
  total_ratings: number;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  specialization: string;
  license_number: string;
  experience_years: number;
  bio: string;
  profile_image: string;
  // Additional comprehensive information
  city?: string;
  country?: string;
  address?: string;
  state?: string;
  postal_code?: string;
  display_name?: string;
  national_id?: string;
  medical_degree?: string;
  health_history?: string;
  occupation?: string;
  google_id?: string;
  is_online_for_instant_sessions?: boolean;
  email_verified_at?: string;
  last_online_at?: string;
  sub_specialization?: string;
  specializations?: string;
  languages_spoken?: string;
  sub_specializations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hospital_affiliation?: string;
  consultation_fee?: number;
  availability_status?: string;
  id_document?: string;
  email_verified?: boolean;
  account_age_days?: number;
}

export default function PendingDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showModal, setShowModal] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPendingDoctors();
  }, [currentPage, searchTerm]);

  const fetchPendingDoctors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
      });

      const response = await fetch(`/api/pending-doctors?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
        setTotalPages(data.totalPages);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to fetch pending doctors: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching pending doctors:', error);
      toast.error('Failed to fetch pending doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (doctorId: number, newStatus: string, closeModal = false) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/users/${doctorId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show success message with email notification status
        if (data.emailNotification) {
          if (data.emailNotification.success) {
            toast.success(`Doctor status updated successfully. ${data.emailNotification.message}`);
          } else {
            toast.success(`Doctor status updated successfully. Note: ${data.emailNotification.message}`);
          }
        } else {
          toast.success('Doctor status updated successfully');
        }
        
        fetchPendingDoctors();
        
        // Close modal if requested
        if (closeModal) {
          setShowModal(false);
          setSelectedDoctor(null);
        }
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update doctor status: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating doctor status:', error);
      toast.error('Failed to update doctor status');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPendingDoctors();
  };


  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      banned: 'bg-red-100 text-red-800',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Doctors</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve doctor registrations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">
                  {doctors.length} Doctor{doctors.length !== 1 ? 's' : ''} Awaiting Review
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Doctors
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Doctors List */}
        <div className="bg-white shadow rounded-lg">
          {doctors.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending doctors</h3>
              <p className="mt-1 text-sm text-gray-500">
                All doctors have been reviewed or no doctors are currently pending approval.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specialization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {doctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {doctor.profile_image ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={doctor.profile_image}
                                  alt={`${doctor.first_name} ${doctor.last_name}`}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-green-800">
                                    {getInitials(doctor.first_name, doctor.last_name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                Dr. {doctor.first_name} {doctor.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{doctor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doctor.specialization || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doctor.experience_years ? `${doctor.experience_years} years` : 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doctor.rating ? (
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span>{Number(doctor.rating).toFixed(1)}</span>
                              <span className="text-gray-500 ml-1">({doctor.total_ratings || 0})</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No ratings</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doctor.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(doctor.id, 'approved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(doctor.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Doctor Details Modal */}
        {selectedDoctor && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-16 w-16">
                      {selectedDoctor.profile_image ? (
                        <img
                          className="h-16 w-16 rounded-full object-cover"
                          src={selectedDoctor.profile_image}
                          alt={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-xl font-medium text-green-800">
                            {getInitials(selectedDoctor.first_name, selectedDoctor.last_name)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">User ID: {selectedDoctor.id}</p>
                      <p className="text-sm text-gray-500">Account Age: {selectedDoctor.account_age_days || 0} days</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedDoctor(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Personal Information Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedDoctor.email}
                        {selectedDoctor.email_verified && (
                          <span className="ml-2 text-green-600 text-xs">✓ Verified</span>
                        )}
                      </p>
                    </div>
                    {selectedDoctor.phone_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <p className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {selectedDoctor.phone_number}
                        </p>
                      </div>
                    )}
                    {selectedDoctor.date_of_birth && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="text-sm text-gray-900">
                          {formatDate(selectedDoctor.date_of_birth)}
                        </p>
                      </div>
                    )}
                    {selectedDoctor.gender && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedDoctor.gender}</p>
                      </div>
                    )}
                    {selectedDoctor.national_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">National ID</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedDoctor.national_id}</p>
                      </div>
                    )}
                    {selectedDoctor.google_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Google ID</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedDoctor.google_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Information Section */}
                {(selectedDoctor.city || selectedDoctor.country) && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Address Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedDoctor.address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <p className="text-sm text-gray-900 flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {selectedDoctor.address}
                          </p>
                        </div>
                      )}
                      {selectedDoctor.city && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <p className="text-sm text-gray-900">{selectedDoctor.city}</p>
                        </div>
                      )}
                      {selectedDoctor.state && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <p className="text-sm text-gray-900">{selectedDoctor.state}</p>
                        </div>
                      )}
                      {selectedDoctor.country && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Country</label>
                          <p className="text-sm text-gray-900">{selectedDoctor.country}</p>
                        </div>
                      )}
                      {selectedDoctor.postal_code && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                          <p className="text-sm text-gray-900">{selectedDoctor.postal_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Professional Information Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Professional Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specializations</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.specialization || 'Not specified'}</p>
                    </div>
                    {selectedDoctor.experience_years && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Experience</label>
                        <p className="text-sm text-gray-900">
                          {selectedDoctor.experience_years} years
                        </p>
                      </div>
                    )}
                    {selectedDoctor.license_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medical License</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedDoctor.license_number}</p>
                      </div>
                    )}
                    {selectedDoctor.medical_degree && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medical Degree</label>
                        <p className="text-sm text-gray-900">{selectedDoctor.medical_degree}</p>
                      </div>
                    )}
                    {selectedDoctor.hospital_affiliation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Hospital Affiliation</label>
                        <p className="text-sm text-gray-900">{selectedDoctor.hospital_affiliation}</p>
                      </div>
                    )}
                    {selectedDoctor.consultation_fee && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Consultation Fee</label>
                        <p className="text-sm text-gray-900">
                          ${selectedDoctor.consultation_fee}
                        </p>
                      </div>
                    )}
                    {selectedDoctor.languages_spoken && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Languages Spoken</label>
                        <p className="text-sm text-gray-900">{selectedDoctor.languages_spoken}</p>
                      </div>
                    )}
                    {selectedDoctor.availability_status && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Availability Status</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedDoctor.availability_status}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Account Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Type</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedDoctor.user_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedDoctor.status}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Active</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.is_active ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Applied Date</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(selectedDoctor.created_at)}
                      </p>
                    </div>
                    {selectedDoctor.last_online_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Online</label>
                        <p className="text-sm text-gray-900">
                          {formatDate(selectedDoctor.last_online_at)}
                        </p>
                      </div>
                    )}
                    {selectedDoctor.rating && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rating</label>
                        <p className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                            {Number(selectedDoctor.rating).toFixed(1)} ({selectedDoctor.total_ratings || 0} reviews)
                          </div>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact Section */}
                {(selectedDoctor.emergency_contact_name || selectedDoctor.emergency_contact_phone) && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                        <p className="text-sm text-gray-900">{selectedDoctor.emergency_contact_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                        <p className="text-sm text-gray-900">{selectedDoctor.emergency_contact_phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bio Section */}
                {selectedDoctor.bio && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bio</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-md">{selectedDoctor.bio}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => handleStatusChange(selectedDoctor.id, 'rejected', true)}
                    className="bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedDoctor.id, 'approved', true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Approve
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





