<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AppointmentService
{
    public function proposeReschedule(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        if (Auth::id() !== $appointment->doctor_id) {
            return [false, 'Only the assigned doctor can propose reschedule', 403];
        }
        if (!in_array($appointment->status, [Appointment::STATUS_CONFIRMED, Appointment::STATUS_PENDING])) {
            return [false, 'Appointment cannot be rescheduled in its current state', 400];
        }
        $request->validate([
            'reschedule_proposed_date' => 'required|date',
            'reschedule_proposed_time' => 'required',
            'reschedule_reason' => 'required|string|max:500'
        ]);

        // Custom validation for reschedule date
        $rescheduleDate = $request->input('reschedule_proposed_date');
        if ($rescheduleDate) {
            $today = now()->format('Y-m-d');
            $rescheduleDateOnly = date('Y-m-d', strtotime($rescheduleDate));
            
            if ($rescheduleDateOnly < $today) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []), 
                    'Reschedule date cannot be in the past.'
                );
            }
        }
        $appointment->update([
            'status' => Appointment::STATUS_RESCHEDULE_PROPOSED,
            'reschedule_proposed_date' => $request->reschedule_proposed_date,
            'reschedule_proposed_time' => $request->reschedule_proposed_time,
            'reschedule_reason' => $request->reschedule_reason,
            'reschedule_proposed_by' => Auth::id(),
            'reschedule_status' => Appointment::RESCHEDULE_PENDING
        ]);
        return [true, $appointment];
    }

    public function respondToReschedule(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        if (Auth::id() !== $appointment->patient_id) {
            return [false, 'Only the patient can respond to reschedule proposals', 403];
        }
        if ($appointment->status !== Appointment::STATUS_RESCHEDULE_PROPOSED) {
            return [false, 'No pending reschedule proposal found', 400];
        }
        $request->validate([
            'response' => 'required|in:accept,reject',
            'patient_comment' => 'sometimes|string|max:500'
        ]);
        if ($request->response === 'accept') {
            $appointment->update([
                'appointment_date' => $appointment->reschedule_proposed_date,
                'appointment_time' => $appointment->reschedule_proposed_time,
                'status' => Appointment::STATUS_RESCHEDULE_ACCEPTED,
                'reschedule_status' => Appointment::RESCHEDULE_ACCEPTED
            ]);
            $message = 'Reschedule accepted';
        } else {
            $appointment->update([
                'status' => Appointment::STATUS_RESCHEDULE_REJECTED,
                'reschedule_status' => Appointment::RESCHEDULE_REJECTED
            ]);
            $message = 'Reschedule rejected';
        }
        return [true, $appointment, $message];
    }

    public function updateStatus(Request $request, $id)
    {
        \Log::info('🔄 [AppointmentService] updateStatus called', [
            'doctor_id' => $request->user()->id,
            'appointment_id' => $id,
            'requested_status' => $request->status,
            'request_data' => $request->all()
        ]);

        try {
            $doctor = $request->user();
            $appointment = $doctor->doctorAppointments()->findOrFail($id);
            
            \Log::info('✅ [AppointmentService] Found appointment', [
                'appointment_id' => $appointment->id,
                'current_status' => $appointment->status,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time
            ]);

            // Check if appointment has expired (allow updates within 24 hours of appointment time)
            $appointmentDateTime = \Carbon\Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
            $now = \Carbon\Carbon::now();
            $twentyFourHoursAfter = $appointmentDateTime->copy()->addHours(24);
            
            if ($now->isAfter($twentyFourHoursAfter)) {
                \Log::warning('⚠️ [AppointmentService] Attempting to update appointment more than 24 hours after scheduled time', [
                    'appointment_id' => $appointment->id,
                    'appointment_datetime' => $appointmentDateTime->toDateTimeString(),
                    'current_time' => $now->toDateTimeString(),
                    'twenty_four_hours_after' => $twentyFourHoursAfter->toDateTimeString(),
                    'requested_status' => $request->status
                ]);
                
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []), 
                    'Cannot update appointment status - appointment time has passed more than 24 hours ago.'
                );
            }

            $request->validate([
                'status' => 'required|in:pending,confirmed,cancelled,completed'
            ]);
            
            // Convert string status to numeric status
            $numericStatus = null;
            switch (strtolower($request->status)) {
                case 'pending':
                    $numericStatus = Appointment::STATUS_PENDING;
                    break;
                case 'confirmed':
                    $numericStatus = Appointment::STATUS_CONFIRMED;
                    break;
                case 'cancelled':
                    $numericStatus = Appointment::STATUS_CANCELLED;
                    break;
                case 'completed':
                    $numericStatus = Appointment::STATUS_COMPLETED;
                    break;
                default:
                    \Log::error('❌ [AppointmentService] Invalid status provided', [
                        'requested_status' => $request->status,
                        'appointment_id' => $id
                    ]);
                    throw new \Illuminate\Validation\ValidationException(
                        validator([], []), 
                        'Invalid status provided.'
                    );
            }
            
            \Log::info('🔄 [AppointmentService] Updating appointment status', [
                'appointment_id' => $appointment->id,
                'old_status' => $appointment->status,
                'new_status' => $numericStatus,
                'status_string' => $request->status
            ]);
            
            $appointment->status = $numericStatus;
            $appointment->save();
            
            \Log::info('✅ [AppointmentService] Appointment status updated successfully', [
                'appointment_id' => $appointment->id,
                'new_status' => $appointment->status
            ]);
            
            // Send notifications to patient about status change
            try {
                $notificationService = new \App\Services\NotificationService();
                $notificationType = strtolower($request->status);
                
                \Log::info('📧 [AppointmentService] Sending notification to patient', [
                    'appointment_id' => $appointment->id,
                    'notification_type' => $notificationType,
                    'patient_id' => $appointment->patient_id
                ]);
                
                $notificationService->sendAppointmentNotification($appointment, $notificationType);
                
                // Also send push notification
                $pushNotificationService = new \App\Services\PushNotificationService();
                $pushNotificationService->sendAppointmentNotification($appointment, $notificationType);
                
                \Log::info('✅ [AppointmentService] Notifications sent successfully', [
                    'appointment_id' => $appointment->id,
                    'notification_type' => $notificationType
                ]);
            } catch (\Exception $e) {
                \Log::error('❌ [AppointmentService] Failed to send notifications', [
                    'appointment_id' => $appointment->id,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the status update if notifications fail
            }
            
            return $appointment;
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('❌ [AppointmentService] Appointment not found', [
                'appointment_id' => $id,
                'doctor_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('❌ [AppointmentService] Validation error', [
                'appointment_id' => $id,
                'validation_errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        } catch (\Exception $e) {
            \Log::error('❌ [AppointmentService] Unexpected error', [
                'appointment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Delete an expired appointment
     */
    public function deleteExpiredAppointment(Request $request, $id)
    {
        \Log::info('🗑️ [AppointmentService] deleteExpiredAppointment called', [
            'doctor_id' => $request->user()->id,
            'appointment_id' => $id
        ]);

        try {
            $doctor = $request->user();
            $appointment = $doctor->doctorAppointments()->find($id);
            
            if (!$appointment) {
                \Log::warning('⚠️ [AppointmentService] Appointment not found for deletion', [
                    'appointment_id' => $id,
                    'doctor_id' => $doctor->id
                ]);
                
                // Return success since the appointment is already gone
                return true;
            }
            
            \Log::info('✅ [AppointmentService] Found appointment for deletion', [
                'appointment_id' => $appointment->id,
                'current_status' => $appointment->status,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time
            ]);

            // Check if appointment has expired
            $appointmentDateTime = \Carbon\Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
            $now = \Carbon\Carbon::now();
            
            if (!$appointmentDateTime->isPast()) {
                \Log::warning('⚠️ [AppointmentService] Attempting to delete non-expired appointment', [
                    'appointment_id' => $appointment->id,
                    'appointment_datetime' => $appointmentDateTime->toDateTimeString(),
                    'current_time' => $now->toDateTimeString()
                ]);
                
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []), 
                    'Cannot delete appointment - appointment time has not passed yet.'
                );
            }

            // Check if appointment is in a deletable state (pending or cancelled)
            if (!$appointment->canBeDeleted()) {
                \Log::warning('⚠️ [AppointmentService] Attempting to delete appointment in non-deletable state', [
                    'appointment_id' => $appointment->id,
                    'status' => $appointment->status,
                    'status_type' => gettype($appointment->status),
                    'normalized_status' => $appointment->normalized_status
                ]);
                
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []), 
                    'Cannot delete appointment - only pending or cancelled appointments can be deleted.'
                );
            }

            \Log::info('🗑️ [AppointmentService] Deleting expired appointment', [
                'appointment_id' => $appointment->id,
                'status' => $appointment->status
            ]);
            
            $appointment->delete();
            
            \Log::info('✅ [AppointmentService] Appointment deleted successfully', [
                'appointment_id' => $id
            ]);
            
            return true;
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('❌ [AppointmentService] Appointment not found for deletion', [
                'appointment_id' => $id,
                'doctor_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('❌ [AppointmentService] Validation error during deletion', [
                'appointment_id' => $id,
                'validation_errors' => $e->errors()
            ]);
            throw $e;
        } catch (\Exception $e) {
            \Log::error('❌ [AppointmentService] Unexpected error during deletion', [
                'appointment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
} 