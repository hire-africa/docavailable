<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10|max:500',
            'reviewer_id' => 'required|exists:users,id'
        ];

        // For updates, make fields optional
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules = [
                'rating' => 'sometimes|integer|min:1|max:5',
                'comment' => 'sometimes|string|min:10|max:500',
                'reviewer_id' => 'sometimes|exists:users,id'
            ];
        }

        return $rules;
    }

    public function messages()
    {
        return [
            'rating.required' => 'Rating is required.',
            'rating.integer' => 'Rating must be a number.',
            'rating.min' => 'Rating must be at least 1.',
            'rating.max' => 'Rating cannot exceed 5.',
            'comment.required' => 'Comment is required.',
            'comment.min' => 'Comment must be at least 10 characters.',
            'comment.max' => 'Comment cannot exceed 500 characters.',
            'reviewer_id.required' => 'Reviewer ID is required.',
            'reviewer_id.exists' => 'Selected reviewer does not exist.',
        ];
    }
} 