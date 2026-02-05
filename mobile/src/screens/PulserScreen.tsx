/**
 * Pulser Tab - Report parking spots with improved photo UX
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
    Image,
    Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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

    // Photo state
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [showPhotoPreview, setShowPhotoPreview] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        loadSpots();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        await locationService.requestPermission();

        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraResult.status !== 'granted' || mediaResult.status !== 'granted') {
            setPermissionDenied(true);
        } else {
            setPermissionDenied(false);
        }
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
        // Reset photo state for new report
        setPhotoUri(null);
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

    // Photo capture with local storage
    const capturePhoto = async () => {
        if (permissionDenied) {
            Alert.alert(
                'Camera Permission Required',
                'Please enable camera access in your device settings to take photos.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Open Settings', onPress: () => {
                            // On iOS this would open settings, but for now just alert
                            Alert.alert('Go to Settings > ParkPulse > Camera');
                        }
                    }
                ]
            );
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.7,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets[0]) {
                const tempUri = result.assets[0].uri;

                // Try to save to permanent storage, but fallback to tempUri if it fails
                const savedUri = await savePhotoToStorage(tempUri);

                if (savedUri) {
                    setPhotoUri(savedUri);
                    console.log('📸 Photo saved:', savedUri);
                } else {
                    // Fallback to temp URI so user can still proceed
                    console.warn('⚠️ Saving failed, using temp URI');
                    setPhotoUri(tempUri);
                }
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
        }
    };

    // Save photo to local storage for persistence
    const savePhotoToStorage = async (tempUri: string): Promise<string | null> => {
        try {
            // Use document directory or cache directory as fallback
            const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;

            if (!directory) {
                console.error('FileSystem directory is null');
                return null;
            }

            const fileName = `spot_photo_${Date.now()}.jpg`;
            const destinationUri = `${directory}${fileName}`;

            await FileSystem.copyAsync({
                from: tempUri,
                to: destinationUri,
            });

            return destinationUri;
        } catch (error: any) {
            console.error('Error saving photo:', error);
            // Show the actual error message for debugging
            Alert.alert('Photo Save Error', error.message || 'Unknown file system error');
            return null;
        }
    };

    // Retake photo (delete old, capture new)
    const retakePhoto = async () => {
        // Delete old photo if exists
        if (photoUri) {
            try {
                await FileSystem.deleteAsync(photoUri, { idempotent: true });
            } catch (error) {
                console.error('Error deleting old photo:', error);
            }
        }

        setShowPhotoPreview(false);
        setPhotoUri(null);

        // Small delay then open camera
        setTimeout(() => {
            capturePhoto();
        }, 300);
    };

    const confirmSpotLocation = () => {
        if (!reportingLocation) return;

        Alert.alert(
            'Confirm Location',
            `Report spot at:\n${reportingAddress}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: handleSubmitSpot
                }
            ]
        );
    };

    const handleSubmitSpot = async () => {
        if (!reportingLocation) return;

        setIsReporting(false);
        await submitSpot(
            reportingLocation.latitude,
            reportingLocation.longitude,
            reportingAddress,
            photoUri || undefined
        );

        // Reset photo after submit
        setPhotoUri(null);
    };

    const cancelReporting = () => {
        // Clean up photo if didn't submit
        if (photoUri) {
            FileSystem.deleteAsync(photoUri, { idempotent: true }).catch(() => { });
        }
        setPhotoUri(null);
        setIsReporting(false);
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
                    <View style={styles.spotInfo}>
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
                    {item.photo_url && (
                        <Image
                            source={{ uri: item.photo_url }}
                            style={styles.spotThumbnail}
                        />
                    )}
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

    // Photo preview modal
    const renderPhotoPreviewModal = () => (
        <Modal
            visible={showPhotoPreview}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPhotoPreview(false)}
        >
            <View style={styles.previewModalOverlay}>
                <View style={styles.previewModalContent}>
                    {photoUri && (
                        <Image
                            source={{ uri: photoUri }}
                            style={styles.previewImage}
                            resizeMode="contain"
                        />
                    )}

                    <View style={styles.previewActions}>
                        <TouchableOpacity
                            style={styles.previewCloseButton}
                            onPress={() => setShowPhotoPreview(false)}
                        >
                            <Text style={styles.previewCloseText}>✕ Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.previewRetakeButton}
                            onPress={retakePhoto}
                        >
                            <Text style={styles.previewRetakeText}>📷 Retake</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Reporting mode with photo capture
    if (isReporting) {
        return (
            <View style={styles.container}>
                <View style={styles.reportingHeader}>
                    <TouchableOpacity onPress={cancelReporting} style={styles.backButton}>
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
                        <View style={styles.locationCardHeader}>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationTitle}>Spot Location</Text>
                                <Text style={styles.locationAddress}>{reportingAddress}</Text>
                            </View>

                            {/* Photo Section */}
                            <View style={styles.photoSection}>
                                {photoUri ? (
                                    // Show thumbnail if photo exists
                                    <TouchableOpacity
                                        onPress={() => setShowPhotoPreview(true)}
                                        style={styles.photoThumbnailContainer}
                                    >
                                        <Image
                                            source={{ uri: photoUri }}
                                            style={styles.photoThumbnail}
                                        />
                                        <View style={styles.photoCheckmark}>
                                            <Text style={styles.photoCheckmarkText}>✓</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    // Show camera button if no photo
                                    <TouchableOpacity
                                        onPress={capturePhoto}
                                        style={styles.cameraButton}
                                    >
                                        <Text style={styles.cameraButtonIcon}>📷</Text>
                                        <Text style={styles.cameraButtonText}>Photo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Permission denied message */}
                        {permissionDenied && (
                            <View style={styles.permissionWarning}>
                                <Text style={styles.permissionWarningText}>
                                    ⚠️ Camera permission required for photos
                                </Text>
                                <TouchableOpacity onPress={requestPermissions}>
                                    <Text style={styles.permissionGrantText}>Grant Access</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Photo status text */}
                        {photoUri && (
                            <Text style={styles.photoStatusText}>
                                📷 Photo attached • Tap to preview
                            </Text>
                        )}

                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={confirmSpotLocation}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    {photoUri ? '✓ Confirm & Report' : 'Confirm & Report'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Photo Preview Modal */}
                {renderPhotoPreviewModal()}
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
    locationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    locationInfo: {
        flex: 1,
        marginRight: 12,
    },
    locationTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    locationAddress: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },

    // Photo Section
    photoSection: {
        alignItems: 'center',
    },
    cameraButton: {
        backgroundColor: '#f0f0f0',
        width: 64,
        height: 64,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    cameraButtonIcon: {
        fontSize: 24,
    },
    cameraButtonText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    photoThumbnailContainer: {
        position: 'relative',
    },
    photoThumbnail: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#e0e0e0',
    },
    photoCheckmark: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#34C759',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    photoCheckmarkText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    photoStatusText: {
        fontSize: 12,
        color: '#34C759',
        marginTop: 12,
        marginBottom: 4,
    },

    // Permission warning
    permissionWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff3cd',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    permissionWarningText: {
        fontSize: 12,
        color: '#856404',
    },
    permissionGrantText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
    },

    // Preview Modal
    previewModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewModalContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '90%',
        height: '70%',
        borderRadius: 12,
    },
    previewActions: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 20,
    },
    previewCloseButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    previewCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    previewRetakeButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    previewRetakeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    confirmButton: {
        backgroundColor: '#34C759',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15,
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
    spotInfo: {
        flex: 1,
        marginRight: 10,
    },
    spotAddress: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    spotThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#e0e0e0',
    },
    statusBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
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
