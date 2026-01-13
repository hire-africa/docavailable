import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ForceUpdateScreenProps {
    title: string;
    message: string;
    storeUrl: string;
}

export default function ForceUpdateScreen({ title, message, storeUrl }: ForceUpdateScreenProps) {
    const handleUpdatePress = async () => {
        try {
            if (await Linking.canOpenURL(storeUrl)) {
                await Linking.openURL(storeUrl);
            } else {
                // Fallback or just try opening it anyway as some schemes might be tricky
                await Linking.openURL(storeUrl);
            }
        } catch (error) {
            console.error('Failed to open store URL:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="rocket" size={60} color="#4CAF50" />
                </View>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleUpdatePress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>Update Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#4CAF50', // Primary Green
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 12,
        width: '100%',
        shadowColor: "#4CAF50",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
