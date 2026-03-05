import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import citiesData from '../app/cities.json';

// Complete list of all countries in the world
const allCountries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
    'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
    'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
    'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
    'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
    'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
    'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
    'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
    'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
    'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
    'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Malawi is the primary country, so we put it at the top
const countryList = ['Malawi', ...allCountries.filter(c => c !== 'Malawi').sort()];

interface LocationPickerProps {
    country: string;
    setCountry: (country: string) => void;
    city: string;
    setCity: (city: string) => void;
    errors?: any;
    fieldRefs?: any;
}

export default function LocationPicker({ country, setCountry, city, setCity, errors, fieldRefs }: LocationPickerProps) {
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearch, setCitySearch] = useState('');

    const cities = useMemo(() => {
        if (!country) return [];
        const countryCities = (citiesData as Record<string, string[]>)[country] || [];
        return countryCities.sort();
    }, [country]);

    const filteredCities = useMemo(() => {
        if (!citySearch) return cities;
        return cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
    }, [cities, citySearch]);

    const handleCountrySelect = (selectedCountry: string) => {
        setCountry(selectedCountry);
        setCity(''); // Reset city when country changes
        setShowCountryPicker(false);
    };

    const handleCitySelect = (selectedCity: string) => {
        setCity(selectedCity);
        setShowCityPicker(false);
        setCitySearch('');
    };

    const renderCountryItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.pickerItem}
            onPress={() => handleCountrySelect(item)}
        >
            <Text style={styles.pickerItemText}>{item}</Text>
        </TouchableOpacity>
    );

    const renderCityItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.pickerItem}
            onPress={() => handleCitySelect(item)}
        >
            <Text style={styles.pickerItemText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionLabel}>Location</Text>

            <View style={styles.row}>
                <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Country</Text>
                    <TouchableOpacity
                        ref={fieldRefs?.country}
                        style={[styles.pickerButton, errors?.country && styles.inputError]}
                        onPress={() => setShowCountryPicker(true)}
                    >
                        <Text style={[styles.pickerButtonText, !country && styles.placeholderText]}>
                            {country || 'Select Country'}
                        </Text>
                        <FontAwesome name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                    {errors?.country && <Text style={styles.errorText}>{errors.country}</Text>}
                </View>

                <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TouchableOpacity
                        ref={fieldRefs?.city}
                        style={[styles.pickerButton, errors?.city && styles.inputError, !country && styles.disabledButton]}
                        onPress={() => country && setShowCityPicker(true)}
                        disabled={!country}
                    >
                        <Text style={[styles.pickerButtonText, !city && styles.placeholderText]}>
                            {city || 'Select City'}
                        </Text>
                        <FontAwesome name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                    {errors?.city && <Text style={styles.errorText}>{errors.city}</Text>}
                </View>
            </View>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <FontAwesome name="times" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={countryList}
                            keyExtractor={(item) => item}
                            renderItem={renderCountryItem}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                        />
                    </View>
                </View>
            </Modal>

            {/* City Picker Modal */}
            <Modal
                visible={showCityPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowCityPicker(false);
                    setCitySearch('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select City</Text>
                            <TouchableOpacity onPress={() => {
                                setShowCityPicker(false);
                                setCitySearch('');
                            }}>
                                <FontAwesome name="times" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search city..."
                                value={citySearch}
                                onChangeText={setCitySearch}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <FlatList
                            data={filteredCities}
                            keyExtractor={(item) => item}
                            renderItem={renderCityItem}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No cities found</Text>
                                </View>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
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
    input: {
        height: 50,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    disabledButton: {
        backgroundColor: '#F5F5F5',
        borderColor: '#E0E0E0',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
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
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
});