/**
 * Pulser Tab - Report parking spots
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { locationService } from '../services/location';
import { spotAPI } from '../services/api';
import { Spot, Location } from '../types';
import UnifiedMap from '../components/UnifiedMap';

console.log('🚀 PulserScreen loaded');

export default function PulserScreen() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Map reporting state
    const [isReporting, setIsReporting] = useState(false);
    const [reportingLocation, setReportingLocation] = useState<Location | null>(null);
    const [initialRegion, setInitialRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    });
    const [reportingAddress, setReportingAddress] = useState('Loading address...');

    useEffect(() => {
        loadSpots();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        await locationService.requestPermission();
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
    };

    const loadSpots = async () => {
        setRefreshing(true);
        try {
            const data = await spotAPI.getMySpots();
            setSpots(data);
        } catch (error: any) {
            console.error('Error loading spots:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const startReporting = async () => {
        setLoading(true);
        try {
            const location = await locationService.getCurrentLocation();
            setReportingLocation(location);
            setInitialRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });

            // Get initial address
            const address = await locationService.reverseGeocode(
                location.latitude,
                location.longitude
            );
            setReportingAddress(address);

            setIsReporting(true);
        } catch (error) {
            Alert.alert('Error', 'Could not get current location');
        } finally {
            setLoading(false);
        }
    };

    const handleRegionChange = async (region: any) => {
        // Update reporting location center
        // Debounce this in production, but direct set for now
        // We only update the address on confirming or with a debounce 
        // effectively handled by the user stopping dragging
    };

    const handleRegionChangeComplete = async (region: any) => {
        setReportingLocation({
            latitude: region.latitude,
            longitude: region.longitude
        });

        // Reverse geocode new center
        const address = await locationService.reverseGeocode(
            region.latitude,
            region.longitude
        );
        setReportingAddress(address);
    };

    const confirmSpotLocation = async () => {
        if (!reportingLocation) return;

        Alert.alert(
            'Confirm Location',
            `Report spot at:\n${reportingAddress}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => handlePhotoAndSubmit(reportingLocation, reportingAddress)
                }
            ]
        );
    };

    const handlePhotoAndSubmit = async (location: Location, address: string) => {
        setIsReporting(false); // Exit map mode

        Alert.alert(
            'Add Photo?',
            'Would you like to add a photo of the parking spot?',
            [
                {
                    text: 'Skip',
                    onPress: async () => {
                        await submitSpot(location.latitude, location.longitude, address);
                    },
                },
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            quality: 0.7,
                        });

                        if (!result.canceled) {
                            await submitSpot(
                                location.latitude,
                                location.longitude,
                                address,
                                result.assets[0].uri
                            );
                        } else {
                            await submitSpot(location.latitude, location.longitude, address);
                        }
                    },
                },
            ]
        );
    };

    const submitSpot = async (
        latitude: number,
        longitude: number,
        address: string,
        photo_url?: string
    ) => {
        console.log('📍 Submitting spot:', { latitude, longitude, address, photo_url });

        try {
            setLoading(true);
            const result = await spotAPI.reportSpot(latitude, longitude, address, photo_url);
            console.log('✅ Spot reported successfully:', result);

            Alert.alert('Success', 'Parking spot reported!\n\nRefreshing your reports...');
            await loadSpots();
        } catch (error: any) {
            console.error('❌ Failed to submit spot:', error);

            let errorMessage = 'Failed to report spot';

            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                errorMessage = 'Cannot connect to server.\n\nMake sure the backend is running and your device is on the same network.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please log in again.';
            } else if (error.response?.status === 400) {
                errorMessage = error.response?.data?.detail || 'Invalid spot data. Please try again.';
            } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert(
                'Error Reporting Spot',
                errorMessage,
                [
                    { text: 'OK', style: 'default' },
                    { text: 'Retry', onPress: () => submitSpot(latitude, longitude, address, photo_url) }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const renderSpot = ({ item }: { item: Spot }) => {
        const isActive = item.status === 'available';
        const timeRemaining = new Date(item.expires_at).getTime() - Date.now();
        const minutesRemaining = Math.floor(timeRemaining / 60000);

        return (
            <View style={[styles.spotCard, !isActive && styles.spotCardInactive]}>
                <View style={styles.spotHeader}>
                    <Text style={styles.spotAddress}>{item.address || 'Unknown location'}</Text>
                    <View
                        style={[
                            styles.statusBadge,
                            item.status === 'verified' && styles.statusSuccess,
                            item.status === 'failed' && styles.statusFailed,
                        ]}
                    >
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
                {isActive && (
                    <Text style={styles.spotTime}>
                        {minutesRemaining > 0 ? `${minutesRemaining} min remaining` : 'Expired'}
                    </Text>
                )}
                <Text style={styles.spotDate}>
                    Reported: {new Date(item.reported_at).toLocaleString()}
                </Text>
            </View>
        );
    };

    if (isReporting) {
        return (
            <View style={styles.container}>
                <View style={styles.reportingHeader}>
                    <TouchableOpacity onPress={() => setIsReporting(false)} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Set Spot Location</Text>
                </View>

                <View style={styles.mapContainer}>
                    <UnifiedMap
                        style={styles.map}
                        initialRegion={initialRegion}
                        showCenterMarker={true}
                        onRegionChangeComplete={handleRegionChangeComplete}
                    />

                    <View style={styles.locationCard}>
                        <Text style={styles.locationTitle}>Spot Location</Text>
                        <Text style={styles.locationAddress}>{reportingAddress}</Text>
                        <TouchableOpacity style={styles.confirmButton} onPress={confirmSpotLocation}>
                            <Text style={styles.confirmButtonText}>Confirm & Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Report Parking Spots</Text>
                <Text style={styles.subtitle}>Earn money by reporting open spots</Text>
            </View>

            <TouchableOpacity
                style={[styles.reportButton, loading && styles.reportButtonDisabled]}
                onPress={startReporting}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.reportButtonText}>📍 Report Open Spot</Text>
                )}
            </TouchableOpacity>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>My Reports</Text>
                <TouchableOpacity onPress={loadSpots}>
                    <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={spots}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSpot}
                refreshing={refreshing}
                onRefresh={loadSpots}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No spots reported yet</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    reportingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    locationCard: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    locationTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    locationAddress: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    confirmButton: {
        backgroundColor: '#34C759',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reportButton: {
        backgroundColor: '#34C759',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    reportButtonDisabled: {
        opacity: 0.5,
    },
    reportButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    refreshText: {
        color: '#007AFF',
        fontSize: 14,
    },
    spotCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    spotCardInactive: {
        opacity: 0.6,
    },
    spotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    spotAddress: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 10,
    },
    statusSuccess: {
        backgroundColor: '#34C759',
    },
    statusFailed: {
        backgroundColor: '#FF3B30',
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    spotTime: {
        fontSize: 14,
        color: '#FF9500',
        fontWeight: '600',
        marginBottom: 4,
    },
    spotDate: {
        fontSize: 12,
        color: '#999',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
});
