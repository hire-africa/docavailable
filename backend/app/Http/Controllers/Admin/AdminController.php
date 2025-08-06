<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Traits\HasImageUrls;

class AdminController extends Controller
{
    use HasImageUrls;
    /**
     * Get all users (admin only)
     */
    public function getAllUsers(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $role = $request->get('role');
        $search = $request->get('search');
        
        $query = User::with(['subscription']);
        
        // Apply filters
        if ($role) {
            $query->where('user_type', $role);
        }
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    /**
     * Get all appointments (admin only)
     */
    public function getAllAppointments(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $status = $request->get('status');
        $date = $request->get('date');
        $doctorId = $request->get('doctor_id');
        
        $query = Appointment::with(['patient', 'doctor']);
        
        // Apply filters
        if ($status !== null) {
            $query->where('status', $status);
        }
        
        if ($date) {
            $query->whereDate('appointment_date', $date);
        }
        
        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }
        
        $appointments = $query->orderBy('appointment_date', 'desc')
                             ->orderBy('appointment_time', 'asc')
                             ->paginate($perPage);
        
        return response()->json([
            'appointments' => $appointments
        ]);
    }

    /**
     * Update user role (admin only)
     */
    public function updateUserRole(Request $request, $userId): JsonResponse
    {
        $request->validate([
            'role' => 'required|string|in:admin,doctor,patient'
        ]);

        $user = User::findOrFail($userId);
        $user->update(['role' => $request->role]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Get dashboard statistics (admin only)
     */
    public function getDashboardStats(): JsonResponse
    {
        // Use caching for dashboard stats
        $stats = \Illuminate\Support\Facades\Cache::remember('admin_dashboard_stats', 300, function () {
            $totalUsers = User::count();
            $totalDoctors = User::where('user_type', 'doctor')->count();
            $totalPatients = User::where('user_type', 'patient')->count();
            $totalAppointments = Appointment::count();
            $pendingAppointments = Appointment::where('status', 0)->count();
            $completedAppointments = Appointment::where('status', 3)->count();
            $todayAppointments = Appointment::whereDate('appointment_date', today())->count();

            return [
                'total_users' => $totalUsers,
                'total_doctors' => $totalDoctors,
                'total_patients' => $totalPatients,
                'total_appointments' => $totalAppointments,
                'pending_appointments' => $pendingAppointments,
                'completed_appointments' => $completedAppointments,
                'today_appointments' => $todayAppointments,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get pending doctors for approval (admin only)
     */
    public function getPendingDoctors(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $search = $request->get('search');
        
        $query = User::where('user_type', 'doctor')
                    ->where('status', 'pending');
        
        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('specialization', 'like', "%{$search}%");
            });
        }
        
        $doctors = $query->orderBy('created_at', 'desc')
                        ->paginate($perPage);
        
        // Add profile picture URLs to each doctor
        $doctors->getCollection()->transform(function ($doctor) {
            $doctorData = $doctor->toArray();
            if ($doctor->profile_picture) {
                $doctorData['profile_picture_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->profile_picture);
            }
            return $doctorData;
        });
        
        return response()->json([
            'success' => true,
            'data' => $doctors
        ]);
    }

    /**
     * Get specific doctor details (admin only)
     */
    public function getDoctorDetails($doctorId): JsonResponse
    {
        $doctor = User::where('user_type', 'doctor')
                     ->where('id', $doctorId)
                     ->first();
        
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor not found'
            ], 404);
        }
        
        // Generate full URLs for images if they exist
        $doctorData = $this->generateImageUrls($doctor);
        
        // Map backend field names to frontend expectations
        $doctorData['certificate_image'] = $doctor->medical_degree;
        $doctorData['license_image'] = $doctor->medical_licence;
        
        // Add additional URLs for documents
        if ($doctor->medical_degree) {
            $doctorData['certificate_image_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->medical_degree);
        }
        if ($doctor->medical_licence) {
            $doctorData['license_image_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->medical_licence);
        }
        if ($doctor->national_id) {
            $doctorData['national_id_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->national_id);
        }
        
        return response()->json([
            'success' => true,
            'data' => $doctorData
        ]);
    }

    /**
     * Approve doctor (admin only)
     */
    public function approveDoctor($doctorId): JsonResponse
    {
        $doctor = User::where('user_type', 'doctor')
                     ->where('id', $doctorId)
                     ->first();
        
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor not found'
            ], 404);
        }
        
        if ($doctor->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Doctor is not pending approval'
            ], 400);
        }
        
        $doctor->update(['status' => 'approved']);
        
        // Send notification to doctor (you can implement this later)
        // event(new DoctorApproved($doctor));
        
        return response()->json([
            'success' => true,
            'message' => 'Doctor approved successfully',
            'data' => $doctor
        ]);
    }

    /**
     * Reject doctor (admin only)
     */
    public function rejectDoctor($doctorId): JsonResponse
    {
        $doctor = User::where('user_type', 'doctor')
                     ->where('id', $doctorId)
                     ->first();
        
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor not found'
            ], 404);
        }
        
        if ($doctor->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Doctor is not pending approval'
            ], 400);
        }
        
        $doctor->update(['status' => 'rejected']);
        
        // Send notification to doctor (you can implement this later)
        // event(new DoctorRejected($doctor));
        
        return response()->json([
            'success' => true,
            'message' => 'Doctor rejected successfully',
            'data' => $doctor
        ]);
    }

    /**
     * Create a new user (admin only)
     */
    public function createUser(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:64|confirmed',
            'role' => 'required|string|in:admin,doctor,patient',
        ]);
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => $request->role,
        ]);
        return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
    }

    /**
     * Update a user (admin only)
     */
    public function updateUser(Request $request, $userId)
    {
        $user = User::findOrFail($userId);
        $request->validate([
            'first_name' => 'sometimes|string|max:50',
            'last_name' => 'sometimes|string|max:50',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8|max:64|confirmed',
            'role' => 'sometimes|string|in:admin,doctor,patient',
        ]);
        $data = $request->only(['first_name', 'last_name', 'email', 'role']);
        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->password);
        }
        $user->update($data);
        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    }

    /**
     * Delete a user (admin only)
     */
    public function deleteUser($userId)
    {
        $user = User::findOrFail($userId);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }
}
