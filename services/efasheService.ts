import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API URL - Laravel backend on DigitalOcean
const API_URL = 'https://docavailable-3vbdv.ondigitalocean.app/api';

export const efasheService = {
    /**
     * Send OTP to the provided phone number.
     * @param phone The phone number including country code.
     */
    sendOtp: async (phone: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ phone }),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }
    },

    /**
     * Verify the OTP sent to the phone number.
     * On success, this stores the token in AsyncStorage.
     * @param phone The phone number.
     * @param otp The one-time password.
     */
    verifyOtp: async (phone: string, otp: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ phone, otp }),
            });

            const data = await response.json();

            if (data.success && data.token) {
                await AsyncStorage.setItem('token', data.token);
                if (data.user) {
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                }
            }

            return data;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    }
};
