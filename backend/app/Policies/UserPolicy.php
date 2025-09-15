<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any users.
     */
    public function viewAny(User $user): bool
    {
        // Only admins can view all users
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view the user.
     */
    public function view(User $user, User $model): bool
    {
        // Users can view their own profile, or admins can view any
        return $user->id === $model->id || $user->isAdmin();
    }

    /**
     * Determine whether the user can create users.
     */
    public function create(User $user): bool
    {
        // Only admins can create users
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the user.
     */
    public function update(User $user, User $model): bool
    {
        // Users can update their own profile, or admins can update any
        return $user->id === $model->id || $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the user.
     */
    public function delete(User $user, User $model): bool
    {
        // Only admins can delete users, and they can't delete themselves
        return $user->isAdmin() && $user->id !== $model->id;
    }

    /**
     * Determine whether the user can update user roles.
     */
    public function updateRole(User $user, User $model): bool
    {
        // Only admins can update roles, and they can't change their own role
        return $user->isAdmin() && $user->id !== $model->id;
    }

    /**
     * Determine whether the user can approve doctors.
     */
    public function approveDoctor(User $user): bool
    {
        // Only admins can approve doctors
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view user statistics.
     */
    public function viewStats(User $user): bool
    {
        // Only admins can view user statistics
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can manage subscriptions.
     */
    public function manageSubscription(User $user, User $model): bool
    {
        // Users can manage their own subscription, or admins can manage any
        return $user->id === $model->id || $user->isAdmin();
    }

    /**
     * Determine whether the user can view working hours.
     */
    public function viewWorkingHours(User $user, User $model): bool
    {
        // Users can view their own working hours, or public can view doctor's hours
        return $user->id === $model->id || $model->isDoctor();
    }

    /**
     * Determine whether the user can manage working hours.
     */
    public function manageWorkingHours(User $user, User $model): bool
    {
        // Users can manage their own working hours, or admins can manage any
        return $user->id === $model->id || $user->isAdmin();
    }
} 