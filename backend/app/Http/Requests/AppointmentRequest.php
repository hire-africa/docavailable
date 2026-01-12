<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AppointmentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'doctor_id' => 'required|exists:users,id',
            'appointment_date' => 'required|date',
            'appointment_time' => 'required|string',
            'appointment_type' => 'sometimes|string|in:text,voice,video,audio',
            'reason' => 'nullable|string|max:500',
            'status' => 'sometimes|integer|in:0,1,2,3'
        ];

        $messages = [
            'doctor_id.exists' => 'Selected doctor does not exist.',
            'appointment_type.in' => 'Invalid appointment type. Must be text, voice, video, or audio.'
        ];

        // For updates, make fields optional
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules = [
                'doctor_id' => 'sometimes|exists:users,id',
                'appointment_date' => 'sometimes|date',
                'appointment_time' => 'sometimes|string',
                'appointment_type' => 'sometimes|string|in:text,voice,video,audio',
                'reason' => 'nullable|string|max:500',
                'status' => 'sometimes|integer|in:0,1,2,3'
            ];
        }

        return $rules;
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $appointmentDate = $this->input('appointment_date');
            $appointmentTime = $this->input('appointment_time');

            // Validate appointment date
            if ($appointmentDate) {
                $today = now()->format('Y-m-d');
                $appointmentDateOnly = date('Y-m-d', strtotime($appointmentDate));

                if ($appointmentDateOnly < $today) {
                    $validator->errors()->add('appointment_date', 'Appointment date cannot be in the past.');
                }

                // Check if date is too far in the future (more than 1 year)
                $oneYearFromNow = now()->addYear()->format('Y-m-d');
                if ($appointmentDateOnly > $oneYearFromNow) {
                    $validator->errors()->add('appointment_date', 'Appointment date cannot be more than 1 year in the future.');
                }
            }

            // Validate appointment time
            if ($appointmentTime) {
                // Check if time format is valid (HH:MM or HH:MM:SS)
                if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $appointmentTime)) {
                    $validator->errors()->add('appointment_time', 'Appointment time must be in HH:MM or HH:MM:SS format.');
                }
            }

            // Validate appointment date and time combination
            if ($appointmentDate && $appointmentTime) {
                try {
                    $appointmentDateTime = \Carbon\Carbon::parse($appointmentDate . ' ' . $appointmentTime);

                    // Check if appointment is in the past
                    if ($appointmentDateTime->isPast()) {
                        $validator->errors()->add('appointment_time', 'Appointment time cannot be in the past.');
                    }

                    // Check if appointment is too far in the future
                    $oneYearFromNow = now()->addYear();
                    if ($appointmentDateTime->isAfter($oneYearFromNow)) {
                        $validator->errors()->add('appointment_time', 'Appointment time cannot be more than 1 year in the future.');
                    }

                    // Check if appointment is within business hours (8 AM to 8 PM)
                    $hour = $appointmentDateTime->hour;
                    if ($hour < 8 || $hour >= 20) {
                        $validator->errors()->add('appointment_time', 'Appointments can only be scheduled between 8:00 AM and 8:00 PM.');
                    }

                } catch (\Exception $e) {
                    $validator->errors()->add('appointment_time', 'Invalid appointment date and time combination.');
                }
            }
        });
    }

    public function messages()
    {
        return [
            'doctor_id.required' => 'Doctor ID is required.',
            'doctor_id.exists' => 'Selected doctor does not exist.',
            'appointment_date.required' => 'Appointment date is required.',
            'appointment_date.date' => 'Appointment date must be a valid date.',
            'appointment_time.required' => 'Appointment time is required.',
            'status.in' => 'Status must be a valid appointment status.',
        ];
    }
}