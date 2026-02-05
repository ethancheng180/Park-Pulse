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
} from 'react-native';
import { locationService } from '../services/location';
import { requestAPI } from '../services/api';
import { Location, Match } from '../types';

// Map components - conditional loading based on platform
// Note: react-native-maps requires a development build (not Expo Go)
// For Expo Go testing, we use a placeholder on native
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let WebMap: any = null;

if (Platform.OS === 'web') {
    // Web uses Leaflet (works in browser)
    try {
        WebMap = require('../components/WebMap').default;
    } catch (e) {
        console.log('WebMap not available');
    }
}
// Note: For native maps, use a development build with react-native-maps

export default function DriverScreen() {
    const [destination, setDestination] = useState('');
    const [destinationCoords, setDestinationCoords] = useState<Location | null>(null);
    const [radius, setRadius] = useState(500); // meters
    const [maxPrice, setMaxPrice] = useState(10); // dollars
    const [loading, setLoading] = useState(false);
    const [match, setMatch] = useState<Match | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(240); // 4 minutes
    const [userLocation, setUserLocation] = useState<Location | null>(null);

    useEffect(() => {
        getCurrentLocation();
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

            // Create parking request
            const result = await requestAPI.createRequest(
                coords.latitude,
                coords.longitude,
                radius,
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

                    <TextInput
                        style={styles.input}
                        placeholder="Destination address"
                        value={destination}
                        onChangeText={setDestination}
                    />

                    <View style={styles.sliderRow}>
                        <Text style={styles.label}>Radius: {radius}m</Text>
                        <View style={styles.radiusButtons}>
                            <TouchableOpacity
                                style={styles.radiusButton}
                                onPress={() => setRadius(Math.max(100, radius - 100))}
                            >
                                <Text>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.radiusButton}
                                onPress={() => setRadius(Math.min(2000, radius + 100))}
                            >
                                <Text>+</Text>
                            </TouchableOpacity>
                        </View>
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

                    {Platform.OS !== 'web' && userLocation && MapView ? (
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                latitudeDelta: 0.02,
                                longitudeDelta: 0.02,
                            }}
                        >
                            <Marker coordinate={userLocation} title="You" />
                            {destinationCoords && (
                                <>
                                    <Marker
                                        coordinate={destinationCoords}
                                        title="Destination"
                                        pinColor="green"
                                    />
                                    <Circle
                                        center={destinationCoords}
                                        radius={radius}
                                        strokeColor="rgba(0,122,255,0.5)"
                                        fillColor="rgba(0,122,255,0.1)"
                                    />
                                </>
                            )}
                        </MapView>
                    ) : Platform.OS === 'web' && WebMap && userLocation ? (
                        <WebMap
                            center={destinationCoords || userLocation}
                            zoom={15}
                            markers={[
                                { position: userLocation, title: 'You', color: 'blue' },
                                ...(destinationCoords ? [{ position: destinationCoords, title: 'Destination', color: 'green' as const }] : []),
                            ]}
                            circle={destinationCoords ? { center: destinationCoords, radius } : undefined}
                            style={{ flex: 1, borderRadius: 10 }}
                        />
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Text style={styles.mapPlaceholderText}>📍 Loading Map...</Text>
                            <Text style={styles.mapPlaceholderSubtext}>
                                {userLocation ? `Your location: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Getting location...'}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.matchContainer}>
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        <Text style={styles.timerLabel}>Time to confirm</Text>
                    </View>

                    {Platform.OS !== 'web' && MapView ? (
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: match.spot.latitude,
                                longitude: match.spot.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: match.spot.latitude,
                                    longitude: match.spot.longitude,
                                }}
                                title="Parking Spot"
                                description={match.spot.address || undefined}
                                pinColor="blue"
                            />
                            {userLocation && (
                                <Marker coordinate={userLocation} title="You" />
                            )}
                        </MapView>
                    ) : Platform.OS === 'web' && WebMap ? (
                        <WebMap
                            center={{ latitude: match.spot.latitude, longitude: match.spot.longitude }}
                            zoom={16}
                            markers={[
                                { position: { latitude: match.spot.latitude, longitude: match.spot.longitude }, title: 'Parking Spot', color: 'orange' },
                                ...(userLocation ? [{ position: userLocation, title: 'You', color: 'blue' as const }] : []),
                            ]}
                            style={{ flex: 1 }}
                        />
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Text style={styles.mapPlaceholderText}>📍 Parking Spot</Text>
                            <Text style={styles.mapPlaceholderSubtext}>
                                Location: {match.spot.latitude.toFixed(4)}, {match.spot.longitude.toFixed(4)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.matchInfo}>
                        <Text style={styles.matchAddress}>
                            {match.spot.address || 'Parking spot'}
                        </Text>
                        <Text style={styles.matchDetails}>
                            Distance: {Math.round(match.distance_meters)}m • Price: ${match.amount}
                        </Text>

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
                </View>
            )}
        </View>
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
});
