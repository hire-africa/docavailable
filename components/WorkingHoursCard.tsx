import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface WorkingHoursCardProps {
    onPress: () => void;
    enabledDaysCount?: number;
}

const WorkingHoursCard: React.FC<WorkingHoursCardProps> = ({ onPress, enabledDaysCount = 0 }) => {
    return (
        <TouchableOpacity style={styles.actionCard} onPress={onPress}>
            <View style={styles.actionIcon}>
                <FontAwesome name="clock-o" size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionTitle}>Working Hours</Text>
            <Text style={styles.actionSubtitle}>
                {enabledDaysCount} days set
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    actionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: Platform.OS === 'web' ? 24 : 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        width: '48%',
        marginBottom: 16,
    },
    actionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionTitle: {
        fontSize: Platform.OS === 'web' ? 16 : 14,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
        textAlign: 'center',
    },
    actionSubtitle: {
        fontSize: Platform.OS === 'web' ? 14 : 12,
        color: '#666',
        textAlign: 'center',
    },
});

export default WorkingHoursCard; 