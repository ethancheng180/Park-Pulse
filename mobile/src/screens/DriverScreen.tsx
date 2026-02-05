/**
 * Driver Tab - Request parking and verify spots
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    FlatList,
    Image,
    ScrollView,
    Modal,
} from 'react-native';
import { locationService } from '../services/location';
import { requestAPI, spotAPI } from '../services/api';
import { Location, Match, Spot } from '../types';

import UnifiedMap from '../components/UnifiedMap';

export default function DriverScreen() {
    const [destination, setDestination] = useState('');
    const [destinationCoords, setDestinationCoords] = useState<Location | null>(null);
    const [maxPrice, setMaxPrice] = useState(10); // dollars
    const [loading, setLoading] = useState(false);
    const [match, setMatch] = useState<Match | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(240); // 4 minutes
    const [userLocation, setUserLocation] = useState<Location | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [availableSpots, setAvailableSpots] = useState<Spot[]>([]);

    useEffect(() => {
        getCurrentLocation();
        loadAvailableSpots();
    }, []);

    useEffect(() => {
        if (match) {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [match]);

    const getCurrentLocation = async () => {
        try {
            const location = await locationService.getCurrentLocation();
            setUserLocation(location);
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadAvailableSpots = async () => {
        try {
            const spots = await spotAPI.getAvailableSpots();
            setAvailableSpots(spots);
            console.log('📍 Loaded', spots.length, 'available spots');
        } catch (error) {
            console.error('Error loading available spots:', error);
        }
    };

    const handleTextChange = async (text: string) => {
        setDestination(text);
        if (text.length > 2) {
            const results = await locationService.getSuggestions(text);
            setSuggestions(results);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (address: string) => {
        setDestination(address);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleFindParking = async () => {
        if (!destination) {
            Alert.alert('Error', 'Please enter a destination');
            return;
        }

        setLoading(true);
        try {
            // Geocode destination
            const coords = await locationService.geocode(destination);
            if (!coords) {
                Alert.alert('Error', 'Could not find destination');
                setLoading(false);
                return;
            }

            setDestinationCoords(coords);

            // Create parking request with fixed 2000m radius
            const result = await requestAPI.createRequest(
                coords.latitude,
                coords.longitude,
                2000, // Fixed radius
                maxPrice,
                destination
            );

            if (result.match) {
                setMatch(result.match);
                setTimeRemaining(240); // Reset timer
                Alert.alert(
                    'Match Found!',
                    `Found a spot ${Math.round(result.match.distance_meters)}m away for $${result.match.amount}`
                );
            } else {
                Alert.alert('No Match', 'No parking spots available nearby');
            }
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to find parking'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (found: boolean) => {
        if (!match) return;

        try {
            await requestAPI.verifySpot(match.id, found);
            Alert.alert(
                'Success',
                found ? 'Enjoy your parking!' : 'Refund initiated'
            );
            setMatch(null);
            setDestination('');
            setDestinationCoords(null);
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to verify'
            );
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {!match ? (
                <View style={styles.searchContainer}>
                    <Text style={styles.title}>Find Parking</Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Destination address"
                            value={destination}
                            onChangeText={handleTextChange}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <FlatList
                                    data={suggestions}
                                    keyExtractor={(item, index) => index.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.suggestionItem}
                                            onPress={() => handleSelectSuggestion(item)}
                                        >
                                            <Text numberOfLines={1} style={styles.suggestionText}>📍 {item}</Text>
                                        </TouchableOpacity>
                                    )}
                                    style={styles.suggestionsList}
                                    scrollEnabled={true}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={styles.label}>Max Price: ${maxPrice}</Text>
                        <View style={styles.radiusButtons}>
                            <TouchableOpacity
                                style={styles.radiusButton}
                                onPress={() => setMaxPrice(Math.max(1, maxPrice - 1))}
                            >
                                <Text>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.radiusButton}
                                onPress={() => setMaxPrice(Math.min(50, maxPrice + 1))}
                            >
                                <Text>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleFindParking}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>🔍 Find Parking</Text>
                        )}
                    </TouchableOpacity>

                    {/* Available spots count */}
                    {availableSpots.length > 0 && (
                        <Text style={styles.spotsAvailable}>
                            📍 {availableSpots.length} parking spot{availableSpots.length !== 1 ? 's' : ''} available nearby
                        </Text>
                    )}

                    {userLocation ? (
                        <UnifiedMap
                            style={styles.map}
                            initialRegion={{
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                latitudeDelta: 0.02,
                                longitudeDelta: 0.02,
                            }}
                            userLocation={userLocation}
                            destinationCoords={destinationCoords}
                            availableSpots={availableSpots}
                        />
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Text>Loading Map...</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.matchContainer}>
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        <Text style={styles.timerLabel}>Time to confirm</Text>
                    </View>

                    <UnifiedMap
                        style={styles.map}
                        initialRegion={{
                            latitude: match.spot.latitude,
                            longitude: match.spot.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        spotLocation={{ latitude: match.spot.latitude, longitude: match.spot.longitude }}
                        spotAddress={match.spot.address || undefined}
                        userLocation={userLocation}
                    />

                    <View style={styles.matchInfo}>
                        <Text style={styles.matchAddress}>
                            {match.spot.address || 'Parking spot'}
                        </Text>
                        <Text style={styles.matchDetails}>
                            Distance: {Math.round(match.distance_meters)}m • Price: ${match.amount}
                        </Text>

                        {/* Photo Proof Section */}
                        {match.spot.photo_url ? (
                            <View style={styles.photoProofSection}>
                                <Text style={styles.photoProofLabel}>📸 Photo Proof from Pulser</Text>
                                <TouchableOpacity onPress={() => setShowPhotoModal(true)}>
                                    <Image
                                        source={{ uri: match.spot.photo_url }}
                                        style={styles.photoProofThumbnail}
                                        resizeMode="cover"
                                    />
                                    <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.noPhotoSection}>
                                <Text style={styles.noPhotoText}>📷 No photo provided</Text>
                            </View>
                        )}

                        <Text style={styles.confirmLabel}>Did you find the spot?</Text>

                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmYes]}
                                onPress={() => handleVerify(true)}
                            >
                                <Text style={styles.confirmButtonText}>✅ Found It</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmNo]}
                                onPress={() => handleVerify(false)}
                            >
                                <Text style={styles.confirmButtonText}>❌ Not There</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Full Screen Photo Modal */}
                    <Modal
                        visible={showPhotoModal}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowPhotoModal(false)}
                    >
                        <TouchableOpacity
                            style={styles.photoModalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowPhotoModal(false)}
                        >
                            <View style={styles.photoModalContent}>
                                <Image
                                    source={{ uri: match.spot.photo_url || '' }}
                                    style={styles.photoModalImage}
                                    resizeMode="contain"
                                />
                                <Text style={styles.photoModalClose}>Tap anywhere to close</Text>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </View>
            )
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    input: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sliderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    radiusButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    radiusButton: {
        backgroundColor: '#fff',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    map: {
        flex: 1,
        borderRadius: 10,
    },
    mapPlaceholder: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mapPlaceholderText: {
        fontSize: 40,
        marginBottom: 10,
    },
    mapPlaceholderSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    matchContainer: {
        flex: 1,
    },
    timerContainer: {
        backgroundColor: '#FF9500',
        padding: 20,
        alignItems: 'center',
    },
    timerText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    timerLabel: {
        fontSize: 14,
        color: '#fff',
        marginTop: 5,
    },
    matchInfo: {
        padding: 20,
        backgroundColor: '#fff',
    },
    matchAddress: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    matchDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    confirmLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
        color: '#333',
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    confirmButton: {
        flex: 1,
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
    },
    confirmYes: {
        backgroundColor: '#34C759',
    },
    confirmNo: {
        backgroundColor: '#FF3B30',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputContainer: {
        width: '100%',
        position: 'relative',
        zIndex: 10,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
        maxHeight: 200,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    suggestionsList: {
        width: '100%',
    },
    suggestionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    suggestionText: {
        fontSize: 14,
        color: '#333',
    },
    // Photo Proof Styles
    photoProofSection: {
        marginVertical: 15,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    photoProofLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 10,
    },
    photoProofThumbnail: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        backgroundColor: '#dee2e6',
    },
    tapToEnlarge: {
        fontSize: 12,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 5,
    },
    noPhotoSection: {
        marginVertical: 15,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        alignItems: 'center',
    },
    noPhotoText: {
        fontSize: 14,
        color: '#6c757d',
    },
    photoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoModalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    photoModalImage: {
        width: '100%',
        height: '80%',
    },
    photoModalClose: {
        color: '#fff',
        fontSize: 14,
        marginTop: 20,
        opacity: 0.7,
    },
    spotsAvailable: {
        fontSize: 14,
        color: '#34C759',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
});
