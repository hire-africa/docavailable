<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WorkingHoursRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'day' => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => 'required|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/',
            'end_time' => 'required|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/|after:start_time',
        ];

        // For updates, make fields optional
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules = [
                'day' => 'sometimes|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'start_time' => 'sometimes|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/',
                'end_time' => 'sometimes|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/|after:start_time',
            ];
        }

        return $rules;
    }

    public function messages()
    {
        return [
            'day.required' => 'Day is required.',
            'day.in' => 'Day must be a valid day of the week.',
            'start_time.required' => 'Start time is required.',
            'start_time.regex' => 'Start time must be in HH:MM format.',
            'end_time.required' => 'End time is required.',
            'end_time.regex' => 'End time must be in HH:MM format.',
            'end_time.after' => 'End time must be after start time.',
        ];
    }
} 