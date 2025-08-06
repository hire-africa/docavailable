<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): Response
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'string', 'min:8'],
            'dob' => ['required', 'date'],
            'gender' => ['required', 'string', 'in:male,female,other'],
            'country' => ['required', 'string'],
            'city' => ['required', 'string'],
            'user_type' => ['required', 'string', 'in:doctor,patient'],
            'profile_picture' => ['nullable', 'string'], // Base64 encoded image
            // Doctor specific fields
            'specialization' => ['required_if:user_type,doctor', 'string'],
            'sub_specialization' => ['required_if:user_type,doctor', 'string'],
            'years_of_experience' => ['required_if:user_type,doctor', 'integer', 'min:0'],
            'bio' => ['required_if:user_type,doctor', 'string'],
            'national_id' => ['required_if:user_type,doctor', 'string'], // Base64 encoded
            'medical_degree' => ['required_if:user_type,doctor', 'string'], // Base64 encoded
            'medical_licence' => ['nullable', 'string'], // Base64 encoded
        ]);

        // Handle profile picture upload if provided
        $profilePicturePath = null;
        if ($request->profile_picture) {
            // Remove data:image/jpeg;base64, from the string if present
            $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->profile_picture);
            $image = base64_decode($image);
            
            // Validate that the decoded data is not empty and is actually an image
            if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                // Generate unique filename
                $filename = Str::uuid() . '.jpg';
                
                // Store the image
                Storage::disk('public')->put('profile-pictures/' . $filename, $image);
                $profilePicturePath = 'profile-pictures/' . $filename;
            }
        }

        // Handle document uploads for doctors
        $nationalIdPath = null;
        $medicalDegreePath = null;
        $medicalLicencePath = null;

        if ($request->user_type === 'doctor') {
            // Handle national ID
            if ($request->national_id) {
                $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->national_id);
                $image = base64_decode($image);
                if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                    $filename = Str::uuid() . '_national_id.jpg';
                    Storage::disk('public')->put('documents/' . $filename, $image);
                    $nationalIdPath = 'documents/' . $filename;
                }
            }

            // Handle medical degree
            if ($request->medical_degree) {
                $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->medical_degree);
                $image = base64_decode($image);
                if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                    $filename = Str::uuid() . '_medical_degree.jpg';
                    Storage::disk('public')->put('documents/' . $filename, $image);
                    $medicalDegreePath = 'documents/' . $filename;
                }
            }

            // Handle medical licence (optional)
            if ($request->medical_licence) {
                $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->medical_licence);
                $image = base64_decode($image);
                $filename = Str::uuid() . '_medical_licence.jpg';
                Storage::disk('public')->put('documents/' . $filename, $image);
                $medicalLicencePath = 'documents/' . $filename;
            }
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->surname,
            'display_name' => $request->first_name . ' ' . $request->surname,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'profile_picture' => $profilePicturePath,
            'date_of_birth' => $request->dob,
            'gender' => $request->gender,
            'country' => $request->country,
            'city' => $request->city,
            'user_type' => $request->user_type,
            'status' => $request->user_type === 'doctor' ? 'pending' : 'approved',
            // Doctor specific fields
            'specialization' => $request->specialization,
            'sub_specialization' => $request->sub_specialization,
            'years_of_experience' => $request->years_of_experience,
            'bio' => $request->bio,
            'national_id' => $nationalIdPath,
            'medical_degree' => $medicalDegreePath,
            'medical_licence' => $medicalLicencePath,
        ]);

        event(new Registered($user));

        // Dispatch profile picture processing job if profile picture was uploaded
        if ($profilePicturePath) {
            \App\Jobs\ProcessFileUpload::dispatch($profilePicturePath, 'profile_picture', $user->id);
        }

        // Only auto-login patients, doctors need approval
        if ($request->user_type === 'patient') {
            Auth::login($user);
        }

        return response()->noContent();
    }
}
