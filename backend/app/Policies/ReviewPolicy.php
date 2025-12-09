<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Reviews;

class ReviewPolicy
{
    /**
     * Determine whether the user can view any reviews.
     */
    public function viewAny(User $user): bool
    {
        return true; // Reviews are public
    }

    /**
     * Determine whether the user can view the review.
     */
    public function view(User $user, Reviews $review): bool
    {
        return true; // Reviews are public
    }

    /**
     * Determine whether the user can create reviews.
     */
    public function create(User $user): bool
    {
        // Only patients can create reviews
        return $user->isPatient();
    }

    /**
     * Determine whether the user can update the review.
     */
    public function update(User $user, Reviews $review): bool
    {
        // Users can update their own reviews, or admins can update any
        return $user->id === $review->user_id || $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the review.
     */
    public function delete(User $user, Reviews $review): bool
    {
        // Users can delete their own reviews, or admins can delete any
        return $user->id === $review->user_id || $user->isAdmin();
    }

    /**
     * Determine whether the user can moderate reviews.
     */
    public function moderate(User $user): bool
    {
        // Only admins can moderate reviews
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view review statistics.
     */
    public function viewStats(User $user): bool
    {
        // Only doctors and admins can view review statistics
        return $user->isDoctor() || $user->isAdmin();
    }
} 