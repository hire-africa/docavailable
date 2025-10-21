<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AnonymizationService
{
    /**
     * Generate a consistent anonymous identifier for a user
     * This ensures the same user always gets the same anonymous ID
     */
    public function getAnonymousIdentifier(User $user): string
    {
        // Simply return "Patient" for all anonymous users
        return "Patient";
    }

    /**
     * Get anonymized display name for a user
     */
    public function getAnonymizedDisplayName(User $user): string
    {
        return $this->getAnonymousIdentifier($user);
    }

    /**
     * Get anonymized profile picture URL based on gender
     */
    public function getAnonymizedProfilePicture(User $user): ?string
    {
        // Determine gender-based profile picture
        $gender = strtolower($user->gender ?? '');
        $baseUrl = config('app.url', 'https://your-domain.com');
        
        if ($gender === 'male') {
            return $baseUrl . '/images/default-avatars/male.jpg';
        } elseif ($gender === 'female') {
            return $baseUrl . '/images/default-avatars/female.jpg';
        } else {
            // For other genders or unknown, default to male
            return $baseUrl . '/images/default-avatars/male.jpg';
        }
    }

    /**
     * Check if a user has anonymous mode enabled
     */
    public function isAnonymousModeEnabled(User $user): bool
    {
        $preferences = $user->privacy_preferences ?? [];
        return $preferences['privacy']['anonymousMode'] ?? false;
    }

    /**
     * Get anonymized user data for display in consultations
     */
    public function getAnonymizedUserData(User $user): array
    {
        return [
            'id' => $user->id, // Keep ID for internal operations
            'display_name' => $this->getAnonymizedDisplayName($user),
            'profile_picture_url' => $this->getAnonymizedProfilePicture($user),
            'profile_picture' => $this->getAnonymizedProfilePicture($user),
            'first_name' => 'Patient',
            'last_name' => '',
            'is_anonymous' => true,
        ];
    }

    /**
     * Get anonymized chat message data
     */
    public function getAnonymizedMessageData(array $messageData, User $sender): array
    {
        $anonymizedData = $messageData;
        
        // Replace sender name with anonymous identifier
        $anonymizedData['sender_name'] = $this->getAnonymizedDisplayName($sender);
        
        // Remove profile picture references
        unset($anonymizedData['sender_profile_picture_url']);
        unset($anonymizedData['sender_profile_picture']);
        
        return $anonymizedData;
    }

    /**
     * Get anonymized appointment data for consultation lists
     */
    public function getAnonymizedAppointmentData(array $appointmentData, User $patient): array
    {
        $anonymizedData = $appointmentData;
        
        // Replace patient name with anonymous identifier
        $anonymizedData['patient_name'] = $this->getAnonymizedDisplayName($patient);
        
        // Remove profile picture references
        unset($anonymizedData['patient_profile_picture_url']);
        unset($anonymizedData['patient_profile_picture']);
        
        return $anonymizedData;
    }

    /**
     * Get anonymized consultation info for chat
     */
    public function getAnonymizedConsultationInfo(array $consultationInfo, User $otherParticipant): array
    {
        $anonymizedData = $consultationInfo;
        
        // Replace other participant name with anonymous identifier
        $anonymizedData['other_participant_name'] = $this->getAnonymizedDisplayName($otherParticipant);
        
        // Remove profile picture references
        unset($anonymizedData['other_participant_profile_picture_url']);
        unset($anonymizedData['other_participant_profile_picture']);
        
        return $anonymizedData;
    }
}
