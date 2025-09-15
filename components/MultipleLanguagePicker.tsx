import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
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

// Languages including all languages spoken in Malawi
const availableLanguages = [
    // Primary languages in Malawi (at the top)
    'Chichewa',
    'English',
    
    // All other languages in alphabetical order
    'Afrikaans',
    'Akan',
    'Amharic',
    'Arabic',
    'Armenian',
    'Assamese',
    'Azerbaijani',
    'Bambara',
    'Bengali',
    'Berber',
    'Bini',
    'Bulgarian',
    'Burmese',
    'Chinese (Cantonese)',
    'Chinese (Mandarin)',
    'Croatian',
    'Czech',
    'Dari',
    'Danish',
    'Dogon',
    'Dutch',
    'Edo',
    'Efik',
    'Ewe',
    'Filipino',
    'Finnish',
    'Fon',
    'French',
    'Fulani',
    'Fulfulde',
    'Ga',
    'Georgian',
    'German',
    'Greek',
    'Gujarati',
    'Hausa',
    'Hebrew',
    'Hindi',
    'Hungarian',
    'Ibibio',
    'Igbo',
    'Indonesian',
    'IsiNdebele',
    'Isoko',
    'Italian',
    'Itsekiri',
    'Ijaw',
    'Japanese',
    'Jukun',
    'Kalabari',
    'Kannada',
    'Kazakh',
    'Khmer',
    'Kinyarwanda',
    'Kirundi',
    'Kiswahili',
    'Kissi',
    'Korean',
    'Kono',
    'Koro',
    'Kurdish',
    'Kuranko',
    'Kyrgyz',
    'Lambya',
    'Lao',
    'Limba',
    'Lomwe',
    'Loma',
    'Luganda',
    'Malay',
    'Malayalam',
    'Mandinka',
    'Mande',
    'Marathi',
    'Mende',
    'Mongolian',
    'Ndebele',
    'Ndali',
    'Nepali',
    'Ngonde',
    'Norwegian',
    'Nupe',
    'Nyanja',
    'Nyakyusa',
    'Odia',
    'Okrika',
    'Ogoni',
    'Oromo',
    'Pashto',
    'Persian (Farsi)',
    'Piti',
    'Polish',
    'Portuguese',
    'Punjabi',
    'Reshe',
    'Romanian',
    'Russian',
    'Sambuga',
    'Sena',
    'Sepedi',
    'Serbian',
    'Sesotho',
    'Setswana',
    'Shama',
    'Shona',
    'Shuwa',
    'Sinhala',
    'Siswati',
    'Slovak',
    'Slovenian',
    'Somali',
    'Songhai',
    'Spanish',
    'Sukwa',
    'Susu',
    'Swahili',
    'Swedish',
    'Tagalog',
    'Tajik',
    'Tamil',
    'Telugu',
    'Temne',
    'Tera',
    'Thai',
    'Tibetan',
    'Tigrinya',
    'Tiv',
    'Tonga',
    'Tshivenda',
    'Tumbuka',
    'Turkish',
    'Turkmen',
    'Twi',
    'Urdu',
    'Urhobo',
    'Uzbek',
    'Vietnamese',
    'Waja',
    'Wolof',
    'Xhosa',
    'Xitsonga',
    'Yao',
    'Yalunka',
    'Yiddish',
    'Yoruba',
    'Zarma',
    'Zulu',
    'Other'
];

interface MultipleLanguagePickerProps {
    selectedLanguages: string[];
    onLanguagesChange: (languages: string[]) => void;
    error?: string;
    maxSelections?: number;
}

const MultipleLanguagePicker: React.FC<MultipleLanguagePickerProps> = ({
    selectedLanguages,
    onLanguagesChange,
    error,
    maxSelections = 5
}) => {
    const [isModalVisible, setModalVisible] = useState(false);

    const handleLanguageToggle = (language: string) => {
        let newLanguages: string[];
        
        if (selectedLanguages.includes(language)) {
            // Remove language
            newLanguages = selectedLanguages.filter(l => l !== language);
        } else {
            // Add language if under limit
            if (selectedLanguages.length < maxSelections) {
                newLanguages = [...selectedLanguages, language];
            } else {
                // Don't add if at limit
                return;
            }
        }
        
        onLanguagesChange(newLanguages);
    };

    const removeLanguage = (language: string) => {
        const newLanguages = selectedLanguages.filter(l => l !== language);
        onLanguagesChange(newLanguages);
    };

    const getDisplayText = () => {
        if (selectedLanguages.length === 0) {
            return 'Select languages you speak (up to 5)';
        }
        if (selectedLanguages.length === 1) {
            return selectedLanguages[0];
        }
        return `${selectedLanguages.length} languages selected`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error && styles.pickerButtonError
                ]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[
                    styles.pickerButtonText,
                    selectedLanguages.length === 0 && styles.placeholderText
                ]}>
                    {getDisplayText()}
                </Text>
                <FontAwesome name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            {/* Selected Languages Chips */}
            {selectedLanguages.length > 0 && (
                <View style={styles.chipsContainer}>
                    {selectedLanguages.map((language) => (
                        <View key={language} style={styles.chip}>
                            <Text style={styles.chipText}>{language}</Text>
                            <TouchableOpacity
                                style={styles.chipRemoveButton}
                                onPress={() => removeLanguage(language)}
                            >
                                <FontAwesome name="times" size={12} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Selection Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Languages</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <FontAwesome name="times" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalScrollView}>
                            {availableLanguages.map((language) => (
                                <TouchableOpacity
                                    key={language}
                                    style={[
                                        styles.modalItem,
                                        selectedLanguages.includes(language) && styles.modalItemSelected,
                                        !selectedLanguages.includes(language) && 
                                        selectedLanguages.length >= maxSelections && styles.modalItemDisabled
                                    ]}
                                    onPress={() => handleLanguageToggle(language)}
                                    disabled={!selectedLanguages.includes(language) && selectedLanguages.length >= maxSelections}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedLanguages.includes(language) && styles.modalItemTextSelected,
                                        !selectedLanguages.includes(language) && 
                                        selectedLanguages.length >= maxSelections && styles.modalItemTextDisabled
                                    ]}>
                                        {language}
                                    </Text>
                                    {selectedLanguages.includes(language) && (
                                        <FontAwesome name="check" size={18} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <View style={styles.modalFooter}>
                            <Text style={styles.selectionCount}>
                                {selectedLanguages.length} of {maxSelections} languages selected
                            </Text>
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginBottom: 8,
    },
    pickerButtonError: {
        borderColor: '#FF3B30',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 6,
    },
    chipRemoveButton: {
        padding: 2,
    },
    selectionCount: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
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
        borderRadius: 16,
        width: isWeb ? Math.min(500, width - 40) : width - 40,
        maxHeight: 600,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalItemSelected: {
        backgroundColor: '#4CAF50',
    },
    modalItemDisabled: {
        backgroundColor: '#F5F5F5',
        opacity: 0.5,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    modalItemTextSelected: {
        color: '#fff',
        fontWeight: '500',
    },
    modalItemTextDisabled: {
        color: '#999',
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    doneButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default MultipleLanguagePicker;
