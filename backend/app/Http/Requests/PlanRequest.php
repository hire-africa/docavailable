<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlanRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'name' => 'required|string|max:100|unique:plans,name',
            'features' => 'required|array|min:1',
            'features.*' => 'string|max:200',
            'currency' => 'required|string|size:3',
            'price' => 'required|numeric|min:0',
            'duration' => 'required|integer|min:1',
            'status' => 'sometimes|boolean'
        ];

        // For updates, make name unique except for current plan
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $planId = $this->route('plan') ?? $this->route('id');
            $rules['name'] = 'sometimes|string|max:100|unique:plans,name,' . $planId;
            $rules['features'] = 'sometimes|array|min:1';
            $rules['currency'] = 'sometimes|string|size:3';
            $rules['price'] = 'sometimes|numeric|min:0';
            $rules['duration'] = 'sometimes|integer|min:1';
        }

        return $rules;
    }

    public function messages()
    {
        return [
            'name.required' => 'Plan name is required.',
            'name.max' => 'Plan name cannot exceed 100 characters.',
            'name.unique' => 'This plan name already exists.',
            'features.required' => 'Plan features are required.',
            'features.array' => 'Features must be an array.',
            'features.min' => 'At least one feature is required.',
            'features.*.string' => 'Each feature must be a string.',
            'features.*.max' => 'Each feature cannot exceed 200 characters.',
            'currency.required' => 'Currency is required.',
            'currency.size' => 'Currency must be 3 characters (e.g., USD, EUR).',
            'price.required' => 'Price is required.',
            'price.numeric' => 'Price must be a number.',
            'price.min' => 'Price cannot be negative.',
            'duration.required' => 'Duration is required.',
            'duration.integer' => 'Duration must be a whole number.',
            'duration.min' => 'Duration must be at least 1.',
            'status.boolean' => 'Status must be true or false.',
        ];
    }

    public function prepareForValidation()
    {
        // Set default status if not provided
        if (!$this->has('status')) {
            $this->merge(['status' => true]);
        }
    }
} 