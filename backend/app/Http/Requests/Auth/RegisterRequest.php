<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $baseRules = [
            'first_name' => 'required|string|max:50|regex:/^[a-zA-Z\s]+$/',
            'last_name' => 'required|string|max:50|regex:/^[a-zA-Z\s]+$/',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'string', 'min:8', 'max:64', 'confirmed', Password::defaults()],
            'user_type' => 'required|string|in:admin,doctor,patient',
            'date_of_birth' => 'required|date|before:today',
            'gender' => 'required|string|in:male,female,other',
            'country' => 'required|string|max:100',
            'city' => 'required|string|max:100',
        ];

        // Patient-specific fields
        if ($this->user_type === 'patient') {
            $baseRules['id_document'] = 'sometimes|file|mimes:jpg,jpeg,png,pdf|max:2048';
        }

        // Doctor-specific fields
        if ($this->user_type === 'doctor') {
            $baseRules['specialization'] = 'required|string|max:100';
            $baseRules['years_of_experience'] = 'required|integer|min:0|max:50';
            $baseRules['professional_bio'] = 'required|string|max:1000';
            $baseRules['national_id'] = 'required|file|mimes:jpg,jpeg,png,pdf|max:2048';
            $baseRules['medical_degree'] = 'required|file|mimes:jpg,jpeg,png,pdf|max:2048';
            $baseRules['medical_licence'] = 'sometimes|file|mimes:jpg,jpeg,png,pdf|max:2048';
        }

        return $baseRules;
    }

    public function messages()
    {
        return [
            'first_name.required' => 'First name is required.',
            'first_name.regex' => 'First name can only contain letters and spaces.',
            'last_name.required' => 'Last name is required.',
            'last_name.regex' => 'Last name can only contain letters and spaces.',
            'email.required' => 'Email is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'user_type.required' => 'User type is required.',
            'user_type.in' => 'User type must be admin, doctor, or patient.',
            'date_of_birth.required' => 'Date of birth is required.',
            'date_of_birth.date' => 'Date of birth must be a valid date.',
            'date_of_birth.before' => 'Date of birth must be in the past.',
            'gender.required' => 'Gender is required.',
            'gender.in' => 'Gender must be male, female, or other.',
            'country.required' => 'Country is required.',
            'city.required' => 'City is required.',
            'id_document.file' => 'ID document must be a file.',
            'id_document.mimes' => 'ID document must be a JPG, JPEG, PNG, or PDF.',
            'id_document.max' => 'ID document must not be larger than 2MB.',
            'specialization.required' => 'Specialization is required.',
            'years_of_experience.required' => 'Years of experience is required.',
            'years_of_experience.integer' => 'Years of experience must be a number.',
            'years_of_experience.min' => 'Years of experience must be at least 0.',
            'years_of_experience.max' => 'Years of experience cannot exceed 50.',
            'professional_bio.required' => 'Professional bio is required.',
            'professional_bio.max' => 'Professional bio cannot exceed 1000 characters.',
            'national_id.required' => 'National ID is required.',
            'national_id.file' => 'National ID must be a file.',
            'national_id.mimes' => 'National ID must be a JPG, JPEG, PNG, or PDF.',
            'national_id.max' => 'National ID must not be larger than 2MB.',
            'medical_degree.required' => 'Medical degree is required.',
            'medical_degree.file' => 'Medical degree must be a file.',
            'medical_degree.mimes' => 'Medical degree must be a JPG, JPEG, PNG, or PDF.',
            'medical_degree.max' => 'Medical degree must not be larger than 2MB.',
            'medical_licence.file' => 'Medical licence must be a file.',
            'medical_licence.mimes' => 'Medical licence must be a JPG, JPEG, PNG, or PDF.',
            'medical_licence.max' => 'Medical licence must not be larger than 2MB.',
        ];
    }

    public function prepareForValidation()
    {
        $this->merge([
            'email' => strtolower($this->email),
        ]);
    }
} 