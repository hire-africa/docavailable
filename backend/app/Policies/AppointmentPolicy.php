<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Appointment;

class AppointmentPolicy
{
    /**
     * Determine whether the user can view any appointments.
     */
    public function viewAny(User $user): bool
    {
        return true; // Users can view their own appointments
    }

    /**
     * Determine whether the user can view the appointment.
     */
    public function view(User $user, Appointment $appointment): bool
    {
        // Users can view appointments they're involved in (as patient or doctor)
        return $user->id === $appointment->patient_id || 
               $user->id === $appointment->doctor_id ||
               $user->isAdmin();
    }

    /**
     * Determine whether the user can create appointments.
     */
    public function create(User $user): bool
    {
        // Only patients can create appointments
        return $user->isPatient();
    }

    /**
     * Determine whether the user can update the appointment.
     */
    public function update(User $user, Appointment $appointment): bool
    {
        // Users can update appointments they're involved in
        return $user->id === $appointment->patient_id || 
               $user->id === $appointment->doctor_id ||
               $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the appointment.
     */
    public function delete(User $user, Appointment $appointment): bool
    {
        // Only admins can delete appointments
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can cancel the appointment.
     */
    public function cancel(User $user, Appointment $appointment): bool
    {
        // Users can cancel appointments they're involved in
        return $user->id === $appointment->patient_id || 
               $user->id === $appointment->doctor_id ||
               $user->isAdmin();
    }

    /**
     * Determine whether the user can propose reschedule.
     */
    public function proposeReschedule(User $user, Appointment $appointment): bool
    {
        // Only the assigned doctor can propose reschedule
        return $user->id === $appointment->doctor_id;
    }

    /**
     * Determine whether the user can respond to reschedule.
     */
    public function respondToReschedule(User $user, Appointment $appointment): bool
    {
        // Only the patient can respond to reschedule proposals
        return $user->id === $appointment->patient_id;
    }

    /**
     * Determine whether the user can view appointment statistics.
     */
    public function viewStats(User $user): bool
    {
        // Only doctors and admins can view appointment statistics
        return $user->isDoctor() || $user->isAdmin();
    }
} 