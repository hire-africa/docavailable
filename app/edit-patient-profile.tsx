import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { apiService } from '../app/services/apiService';
import DatePickerField from '../components/DatePickerField';
import { Icon } from '../components/Icon';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../utils/customAlert';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;



export default function EditPatientProfile() {
    const { user, userData, refreshUserData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    // Validation errors
    const [errors, setErrors] = useState<any>({});

    // Country picker modal state
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }

        // Load existing data first, then try to refresh in background
        const initializeData = async () => {
            try {
                // First load with existing data
                loadUserData();

                // Only refresh if we don't have complete user data
                const hasCompleteData = user && user.first_name && user.last_name;

                if (!hasCompleteData) {
                    // Then try to refresh in background (don't block UI)
                    setTimeout(async () => {
                        try {
                            // console.log('EditPatientProfile: Refreshing user data in background...');
                            await refreshUserData();
                            // Reload data after refresh
                            loadUserData();
                        } catch (error) {
                            console.error('EditPatientProfile: Background refresh failed:', error);
                            // Don't clear data on refresh failure
                        }
                    }, 100);
                } else {
                    // console.log('EditPatientProfile: User data already complete, skipping refresh');
                }
            } catch (error) {
                console.error('EditPatientProfile: Error in initialization:', error);
                // Still try to load with existing data
                loadUserData();
            }
        };

        initializeData();
    }, [user]);

    // Reload data when userData changes
    useEffect(() => {
        if (userData) {
            loadUserData();
        }
    }, [userData]);

    const loadUserData = () => {
        // console.log('EditPatientProfile: Loading user data...');
        // console.log('EditPatientProfile: userData:', userData);
        // console.log('EditPatientProfile: user:', user);
        // console.log('EditPatientProfile: userData type:', typeof userData);
        // console.log('EditPatientProfile: user type:', typeof user);

        try {
            if (userData || user) {
                // Use userData first, then fallback to user
                const currentUser = userData || user;

                // console.log('EditPatientProfile: Using currentUser:', currentUser);
                // console.log('EditPatientProfile: currentUser keys:', Object.keys(currentUser || {}));

                // Validate that we have the expected user data structure
                if (!currentUser || typeof currentUser !== 'object') {
                    console.error('EditPatientProfile: Invalid user data structure:', currentUser);
                    Alert.error('Error', 'Invalid user data. Please try again.');
                    return;
                }

                setFirstName(currentUser?.first_name || '');
                setLastName(currentUser?.last_name || '');
                setDateOfBirth(currentUser?.date_of_birth || '');
                setGender(currentUser?.gender || '');
                setProfilePicture(currentUser?.profile_picture_url || currentUser?.profile_picture || null);

                // console.log('EditPatientProfile: Loaded data:', {
                //   firstName: currentUser?.first_name,
                //   lastName: currentUser?.last_name,
                //   dateOfBirth: currentUser?.date_of_birth,
                //   gender: currentUser?.gender,
                //   bio: currentUser?.bio,
                //   country: currentUser?.country,
                //   city: currentUser?.city,
                //   profilePicture: currentUser?.profile_picture || currentUser?.profile_picture_url
                // });
            } else {
                // console.log('EditPatientProfile: No user data available');
                Alert.error('Error', 'No user data available. Please log in again.');
            }
        } catch (error) {
            console.error('EditPatientProfile: Error loading user data:', error);
            Alert.error('Error', 'Failed to load user data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelected = async (imageUri: string) => {
        try {
            setUploadingImage(true);

            // console.log('EditPatientProfile: Starting image upload...');
            // console.log('EditPatientProfile: Image URI:', imageUri);

            // Debug: Check authentication token
            const token = await apiService.getAuthToken();
            console.log('EditPatientProfile: Auth token available:', !!token);

            // Create form data for image upload
            const formData = new FormData();

            // Convert image to base64 (same approach as signup forms)
            try {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result as string;
                        resolve(base64String);
                    };
                    reader.readAsDataURL(blob);
                });
                formData.append('profile_picture', base64);
            } catch (conversionError) {
                console.error('Profile picture conversion failed:', conversionError);
                throw new Error('Failed to process profile picture. Please try again.');
            }

            // console.log('EditPatientProfile: FormData created, making API request...');

            const response = await apiService.uploadFile('/upload/profile-picture', formData);

            // console.log('EditPatientProfile: Upload response:', response);

            if (response.success) {
                const responseData = response.data as any;
                const newProfilePictureUrl = responseData?.profile_picture_url || imageUri;
                console.log('EditPatientProfile: Upload response data:', response.data);
                console.log('EditPatientProfile: New profile picture URL:', newProfilePictureUrl);
                setProfilePicture(newProfilePictureUrl);

                // Refresh user data to update the profile picture in AuthContext
                try {
                    await refreshUserData();
                    console.log('EditPatientProfile: User data after refresh:', {
                        profile_picture: user?.profile_picture,
                        profile_picture_url: user?.profile_picture_url
                    });

                    // Force a re-render by updating local state
                    setTimeout(() => {
                        // console.log('EditPatientProfile: Forcing re-render after profile picture update');
                        setProfilePicture(newProfilePictureUrl);
                    }, 100);
                } catch (error) {
                    console.error('EditPatientProfile: Error refreshing user data after upload:', error);
                }

                Alert.success('Success', 'Profile picture updated successfully!');
            } else {
                console.error('EditPatientProfile: Upload failed:', response.message || 'Unknown error');
                Alert.error('Error', response.message || 'Failed to upload profile picture');
            }
        } catch (error: any) {
            console.error('EditPatientProfile: Error uploading profile picture:', error);
            console.error('EditPatientProfile: Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });

            let errorMessage = 'Failed to upload profile picture. Please try again.';

            // Check for file size error
            if (error.response?.data?.message && error.response.data.message.includes('2048 kilobytes')) {
                errorMessage = 'Image file is too large. Please select a smaller image (under 2MB).';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.error('Error', errorMessage);
        } finally {
            setUploadingImage(false);
        }
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        }

        if (!gender) {
            newErrors.gender = 'Gender is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            console.log('EditPatientProfile: Starting profile update...');

            const updateData: any = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                date_of_birth: dateOfBirth,
                gender: gender,
            };

            console.log('EditPatientProfile: Update data:', updateData);

            const response = await apiService.patch('/profile', updateData);

            if (response.success) {
                // Refresh user data to get the updated information
                await refreshUserData();

                Alert.success(
                    'Success',
                    'Profile updated successfully!',
                    () => router.back()
                );
            } else {
                console.error('EditPatientProfile: Profile update failed:', response.message);
                Alert.error('Error', response.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('EditPatientProfile: Error updating profile:', error);
            console.error('EditPatientProfile: Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });

            let errorMessage = 'Failed to update profile. Please try again.';

            // Handle validation errors specifically
            if (error.response?.status === 422 && error.response?.data?.errors) {
                const validationErrors = error.response.data.errors;
                const errorFields = Object.keys(validationErrors);
                const errorMessages = errorFields.map(field =>
                    `${field.replace('_', ' ')}: ${validationErrors[field][0]}`
                ).join('\n');
                errorMessage = `Validation failed:\n${errorMessages}`;
                console.error('EditPatientProfile: Validation errors:', validationErrors);
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.error('Error', errorMessage);
        } finally {
            setSaving(false);
        }
    };




    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.content, { maxWidth }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Icon name="back" size={20} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Icon name="save" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Picture Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Picture</Text>
                        <View style={styles.profilePictureContainer}>
                            <ProfilePicturePicker
                                imageUri={profilePicture}
                                onImageSelected={handleImageSelected}
                                size={120}
                                showEditButton={true}
                            />
                            {uploadingImage && (
                                <View style={styles.uploadingOverlay}>
                                    <Text style={styles.uploadingText}>Uploading...</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>First Name *</Text>
                            <TextInput
                                style={[styles.input, errors.firstName && styles.inputError]}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter your first name"
                                placeholderTextColor="#999"
                            />
                            {errors.firstName && (
                                <Text style={styles.errorText}>{errors.firstName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Last Name *</Text>
                            <TextInput
                                style={[styles.input, errors.lastName && styles.inputError]}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter your last name"
                                placeholderTextColor="#999"
                            />
                            {errors.lastName && (
                                <Text style={styles.errorText}>{errors.lastName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Date of Birth *</Text>
                            <DatePickerField
                                value={dateOfBirth}
                                onChange={setDateOfBirth}
                                error={errors.dateOfBirth}
                                minimumDate={new Date(1900, 0, 1)}
                                maximumDate={new Date()}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Gender *</Text>
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[styles.optionButton, gender === 'male' && styles.optionButtonSelected]}
                                    onPress={() => setGender('male')}
                                >
                                    <Text style={[styles.optionText, gender === 'male' && styles.optionTextSelected]}>
                                        Male
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionButton, gender === 'female' && styles.optionButtonSelected]}
                                    onPress={() => setGender('female')}
                                >
                                    <Text style={[styles.optionText, gender === 'female' && styles.optionTextSelected]}>
                                        Female
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionButton, gender === 'other' && styles.optionButtonSelected]}
                                    onPress={() => setGender('other')}
                                >
                                    <Text style={[styles.optionText, gender === 'other' && styles.optionTextSelected]}>
                                        Other
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                        </View>
                    </View>




                    {/* Save Button */}
                    <View style={styles.saveSection}>
                        <TouchableOpacity
                            style={[styles.saveButtonLarge, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Icon name="save" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginTop: 20,
        paddingHorizontal: 10,
    },
    backButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    saveButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    section: {
        marginBottom: 25,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 14,
        marginTop: 4,
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    genderOptionSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    genderOptionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    genderOptionTextSelected: {
        color: '#fff',
    },
    saveSection: {
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 120,
    },
    uploadingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Read-only field styles
    readOnlyField: {
        height: 50,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
    },
    readOnlyText: {
        fontSize: 16,
        color: '#666',
    },
    // Location picker styles
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    pickerButton: {
        height: 50,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    pickerItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#333',
    },
    // Gender option styles
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 4,
        alignItems: 'center',
    },
    optionButtonSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    optionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    optionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
}); 