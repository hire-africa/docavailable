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
            if ($appointmentDate) {
                $today = now()->format('Y-m-d');
                $appointmentDateOnly = date('Y-m-d', strtotime($appointmentDate));
                
                if ($appointmentDateOnly < $today) {
                    $validator->errors()->add('appointment_date', 'Appointment date cannot be in the past.');
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