<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Plan;

class PlanPolicy
{
    /**
     * Determine whether the user can view any plans.
     */
    public function viewAny(User $user): bool
    {
        return true; // Plans are public
    }

    /**
     * Determine whether the user can view the plan.
     */
    public function view(User $user, Plan $plan): bool
    {
        return true; // Plans are public
    }

    /**
     * Determine whether the user can create plans.
     */
    public function create(User $user): bool
    {
        // Only admins can create plans
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the plan.
     */
    public function update(User $user, Plan $plan): bool
    {
        // Only admins can update plans
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the plan.
     */
    public function delete(User $user, Plan $plan): bool
    {
        // Only admins can delete plans
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can subscribe to plans.
     */
    public function subscribe(User $user): bool
    {
        // Any authenticated user can subscribe to plans
        return true;
    }

    /**
     * Determine whether the user can manage plan features.
     */
    public function manageFeatures(User $user): bool
    {
        // Only admins can manage plan features
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view plan statistics.
     */
    public function viewStats(User $user): bool
    {
        // Only admins can view plan statistics
        return $user->isAdmin();
    }
} 