import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { CountryCode, COUNTRY_CODES, getDefaultCountryCode } from '../utils/phoneUtils';

interface CountryCodeSelectorProps {
    selectedCountry: CountryCode;
    onSelect: (country: CountryCode) => void;
    style?: any;
}

export default function CountryCodeSelector({ selectedCountry, onSelect, style }: CountryCodeSelectorProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = COUNTRY_CODES.filter(country =>
        country.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (country: CountryCode) => {
        onSelect(country);
        setShowPicker(false);
        setSearchQuery('');
    };

    const renderCountryItem = ({ item }: { item: CountryCode }) => (
        <TouchableOpacity
            style={styles.countryItem}
            onPress={() => handleSelect(item)}
        >
            <Text style={styles.countryCode}>{item.dialCode}</Text>
            <Text style={styles.countryName}>{item.country}</Text>
            {selectedCountry.code === item.code && (
                <FontAwesome name="check" size={16} color="#4CAF50" style={styles.checkIcon} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
                <FontAwesome name="chevron-down" size={12} color="#666" style={styles.chevron} />
            </TouchableOpacity>

            <Modal
                visible={showPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowPicker(false);
                    setSearchQuery('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowPicker(false);
                                    setSearchQuery('');
                                }}
                            >
                                <FontAwesome name="times" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search country..."
                                placeholderTextColor="#999"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.code}
                            renderItem={renderCountryItem}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: 8,
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 16,
        minWidth: 80,
    },
    dialCodeText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        ...Platform.select({
            web: {
                maxWidth: 500,
                alignSelf: 'center',
                width: '100%',
            },
        }),
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
        margin: 20,
        marginBottom: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        ...Platform.select({
            android: {
                textAlignVertical: 'center',
            },
        }),
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        width: 70,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
        color: '#666',
        marginLeft: 10,
    },
    checkIcon: {
        marginLeft: 'auto',
    },
});

