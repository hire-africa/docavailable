import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Specialization data with user-friendly terms
const specializations = {
    'General Medicine': [
        'Family Medicine',
        'Internal Medicine',
        'Emergency Medicine',
        'Preventive Medicine'
    ],
    'Heart & Blood (Cardiology)': [
        'General Heart Care',
        'Heart Surgery',
        'Blood Pressure & Circulation',
        'Heart Rhythm Problems'
    ],
    'Children\'s Health': [
        'General Child Care',
        'Newborn Care',
        'Child Development',
        'Children\'s Emergency Care'
    ],
    'Women\'s Health': [
        'Pregnancy & Childbirth',
        'Female Health',
        'Fertility Care',
        'Women\'s Surgery'
    ],
    'Brain & Nerves': [
        'General Brain Care',
        'Headache & Pain',
        'Stroke Care',
        'Memory & Movement'
    ],
    'Bones & Joints': [
        'Joint Care',
        'Sports Injuries',
        'Spine Care',
        'Bone Surgery'
    ],
    'Mental Health': [
        'General Mental Health',
        'Anxiety & Depression',
        'Child Mental Health',
        'Addiction Treatment'
    ],
    'Skin Care': [
        'General Skin Care',
        'Skin Conditions',
        'Cosmetic Care',
        'Skin Cancer'
    ],
    'Eye Care': [
        'General Eye Care',
        'Vision Problems',
        'Eye Surgery',
        'Children\'s Eye Care'
    ],
    'Ear, Nose & Throat': [
        'General ENT Care',
        'Hearing Problems',
        'Sinus & Allergy',
        'Voice & Speech'
    ],
    'Sexual Health': [
        'General Sexual Health',
        'Sexual Function',
        'Sexual Education',
        'Sexual Therapy'
    ],
    'Oncology (Cancer Care)': [
        'General Oncology',
        'Breast Cancer',
        'Lung Cancer',
        'Blood Cancer',
        'Pediatric Oncology'
    ],
    'Endocrinology (Hormones & Metabolism)': [
        'Diabetes Care',
        'Thyroid Disorders',
        'Hormone Therapy',
        'Metabolic Disorders',
        'Reproductive Endocrinology'
    ],
    'Gastroenterology (Digestive Health)': [
        'General Gastroenterology',
        'Liver Disease',
        'Inflammatory Bowel Disease',
        'Digestive Disorders',
        'Endoscopy'
    ]
};

interface SpecializationPickerProps {
    selectedSpecialization: string;
    selectedSubSpecialization: string;
    onSpecializationChange: (specialization: string, subSpecialization: string) => void;
    error?: string;
}

const SpecializationPicker: React.FC<SpecializationPickerProps> = ({
    selectedSpecialization,
    selectedSubSpecialization,
    onSpecializationChange,
    error
}) => {
    const [isMainModalVisible, setMainModalVisible] = useState(false);
    const [isSubModalVisible, setSubModalVisible] = useState(false);
    const [tempSpecialization, setTempSpecialization] = useState(selectedSpecialization);
    const [tempSubSpecialization, setTempSubSpecialization] = useState(selectedSubSpecialization);

    useEffect(() => {
        setTempSpecialization(selectedSpecialization);
        setTempSubSpecialization(selectedSubSpecialization);
    }, [selectedSpecialization, selectedSubSpecialization]);

    const handleMainSelection = (specialization: string) => {
        setTempSpecialization(specialization);
        setTempSubSpecialization('');
        setMainModalVisible(false);
        setSubModalVisible(true);
    };

    const handleSubSelection = (subSpecialization: string) => {
        setTempSubSpecialization(subSpecialization);
        setSubModalVisible(false);
        onSpecializationChange(tempSpecialization, subSpecialization);
    };

    const renderModal = (
        visible: boolean,
        onClose: () => void,
        title: string,
        items: string[],
        onSelect: (item: string) => void,
        selectedItem?: string
    ) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScrollView}>
                        {items.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[
                                    styles.modalItem,
                                    selectedItem === item && styles.modalItemSelected
                                ]}
                                onPress={() => onSelect(item)}
                            >
                                <Text style={[
                                    styles.modalItemText,
                                    selectedItem === item && styles.modalItemTextSelected
                                ]}>
                                    {item}
                                </Text>
                                {selectedItem === item && (
                                    <FontAwesome name="check" size={18} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.pickerButton, error && styles.pickerButtonError]}
                onPress={() => setMainModalVisible(true)}
            >
                <Text style={[styles.pickerButtonText, !selectedSpecialization && styles.placeholderText]}>
                    {selectedSpecialization || 'Select your specialization'}
                </Text>
                <FontAwesome name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            {selectedSpecialization && (
                <TouchableOpacity
                    style={[styles.pickerButton, styles.subPickerButton, error && styles.pickerButtonError]}
                    onPress={() => setSubModalVisible(true)}
                >
                    <Text style={[styles.pickerButtonText, !selectedSubSpecialization && styles.placeholderText]}>
                        {selectedSubSpecialization || 'Select your sub-specialization'}
                    </Text>
                    <FontAwesome name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {renderModal(
                isMainModalVisible,
                () => setMainModalVisible(false),
                'Select Your Specialization',
                Object.keys(specializations),
                handleMainSelection,
                tempSpecialization
            )}

            {renderModal(
                isSubModalVisible,
                () => setSubModalVisible(false),
                'Select Your Sub-specialization',
                specializations[tempSpecialization as keyof typeof specializations] || [],
                handleSubSelection,
                tempSubSpecialization
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
    },
    pickerButtonError: {
        borderColor: '#ff4444',
    },
    subPickerButton: {
        backgroundColor: '#f8f9fa',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: isWeb ? Math.min(500, width - 40) : width - 40,
        maxHeight: 500,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalItemSelected: {
        backgroundColor: '#4CAF50',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalItemTextSelected: {
        color: '#fff',
    },
});

export default SpecializationPicker; 