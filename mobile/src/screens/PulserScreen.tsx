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
import { Spot } from '../types';

export default function PulserScreen() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const reportSpot = async () => {
        setLoading(true);
        try {
            // Get current location
            const location = await locationService.getCurrentLocation();

            // Get address
            const address = await locationService.reverseGeocode(
                location.latitude,
                location.longitude
            );

            // Ask if user wants to add a photo (optional)
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
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to get location');
            setLoading(false);
        }
    };

    const submitSpot = async (
        latitude: number,
        longitude: number,
        address: string,
        photo_url?: string
    ) => {
        try {
            await spotAPI.reportSpot(latitude, longitude, address, photo_url);
            Alert.alert('Success', 'Parking spot reported!');
            await loadSpots();
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to report spot'
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Report Parking Spots</Text>
                <Text style={styles.subtitle}>Earn money by reporting open spots</Text>
            </View>

            <TouchableOpacity
                style={[styles.reportButton, loading && styles.reportButtonDisabled]}
                onPress={reportSpot}
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
