import { apiService } from './apiService';

export interface PendingDoctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  user_type: 'doctor';
  status: 'pending';
  specialization?: string;
  sub_specialization?: string;
  years_of_experience?: number;
  bio?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  city?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  certificate_image?: string;
  license_image?: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorDetails {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  user_type: 'doctor';
  status: 'pending' | 'approved' | 'rejected';
  specialization?: string;
  sub_specialization?: string;
  years_of_experience?: number;
  bio?: string;
  professional_bio?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  city?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  certificate_image?: string;
  certificate_image_url?: string;
  license_image?: string;
  license_image_url?: string;
  national_id?: string;
  national_id_url?: string;
  medical_degree?: string;
  medical_licence?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingDoctorsResponse {
  success: boolean;
  data: {
    data: PendingDoctor[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface DoctorDetailsResponse {
  success: boolean;
  data: DoctorDetails;
}

class AdminService {
  /**
   * Get pending doctors for approval
   */
  async getPendingDoctors(page: number = 1, search?: string): Promise<PendingDoctorsResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) {
      params.append('search', search);
    }
    
    const response = await apiService.get(`/admin/doctors/pending?${params.toString()}`);
    return response as PendingDoctorsResponse;
  }

  /**
   * Get specific doctor details
   */
  async getDoctorDetails(doctorId: number): Promise<DoctorDetailsResponse> {
    const response = await apiService.get(`/admin/doctors/${doctorId}`);
    return response as DoctorDetailsResponse;
  }

  /**
   * Approve a doctor
   */
  async approveDoctor(doctorId: number): Promise<{ success: boolean; message: string; data: DoctorDetails }> {
    const response = await apiService.post(`/admin/doctors/${doctorId}/approve`);
    return response;
  }

  /**
   * Reject a doctor
   */
  async rejectDoctor(doctorId: number): Promise<{ success: boolean; message: string; data: DoctorDetails }> {
    const response = await apiService.post(`/admin/doctors/${doctorId}/reject`);
    return response;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    const response = await apiService.get('/admin/dashboard-stats');
    return response;
  }
}

export const adminService = new AdminService(); 