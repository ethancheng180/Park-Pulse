/**
 * Pulser Tab - Native Reporting Flow with Swipe to Delete
 * Updates:
 * - Pin-First Flow (Step 1: Map Drag -> Step 2: Camera -> Step 3: Submit)
 * - Accurate coordinate capture from map center
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    Image,
    Modal,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { locationService } from '../services/location';
import { spotAPI } from '../services/api';
import { Spot, Location } from '../types';
import UnifiedMap from '../components/UnifiedMap';
import { COLORS, SPACING, SHADOWS, RADIUS, TYPOGRAPHY } from '../theme';
import { Button, Card } from '../components/Shared';

export default function PulserScreen() {
    // --- STATE ---
    const [spots, setSpots] = useState<Spot[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Reporting Flow
    const [isReporting, setIsReporting] = useState(false);
    const [reportStep, setReportStep] = useState<'location' | 'photo' | 'confirm'>('location');

    // Data Capture
    const [pinnedLocation, setPinnedLocation] = useState<Location | null>(null);
    const [pinnedAddress, setPinnedAddress] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Debounce for geocoding
    const geocodeTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- EFFECTS ---
    useEffect(() => { loadSpots(); }, []);

    const loadSpots = async () => {
        setRefreshing(true);
        try {
            const data = await spotAPI.getMySpots();
            setSpots(data);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    };

    const handleDelete = (id: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Delete Report', 'Are you sure you want to delete this spot?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setSpots(prev => prev.filter(s => s.id !== id));
                    try {
                        await spotAPI.deleteSpot(id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete on server');
                        loadSpots(); // Revert on failure
                    }
                }
            }
        ]);
    };

    const startReporting = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const loc = await locationService.getCurrentLocation();
            setPinnedLocation(loc); // Initial center
            setReportStep('location');
            setIsReporting(true);
            setPhotoUri(null);

            // Initial geocode
            performReverseGeocode(loc.latitude, loc.longitude);
        } catch (e) { Alert.alert('Error', 'Need location access'); }
    };

    // Called when map drag ends
    const handleRegionChangeComplete = (region: { latitude: number; longitude: number }) => {
        // Update the candidate location
        const newLoc = { latitude: region.latitude, longitude: region.longitude };
        setPinnedLocation(newLoc);
        performReverseGeocode(region.latitude, region.longitude);
    };

    const performReverseGeocode = (lat: number, lon: number) => {
        setIsGeocoding(true);
        if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);

        geocodeTimeout.current = setTimeout(async () => {
            try {
                const addr = await locationService.reverseGeocode(lat, lon);
                setPinnedAddress(addr);
            } catch {
                setPinnedAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            } finally {
                setIsGeocoding(false);
            }
        }, 800);
    };

    const handleCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed');

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5
        });

        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
            // Stay on photo step to show preview, user clicks "Next" manually or we auto-advance? 
            // Uber style: take photo -> show preview -> confirm.
            setReportStep('confirm');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleSubmit = async () => {
        if (!pinnedLocation) return;
        try {
            console.log('Submitting Spot:', {
                lat: pinnedLocation.latitude,
                lon: pinnedLocation.longitude,
                addr: pinnedAddress
            });

            await spotAPI.reportSpot(
                pinnedLocation.latitude,
                pinnedLocation.longitude,
                pinnedAddress,
                photoUri || undefined
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsReporting(false);
            Alert.alert('Spot Posted', 'Thanks for helping the community!');
            loadSpots();
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorMessage = e.response?.data?.detail || e.message || 'Failed to submit report';
            Alert.alert('Error', errorMessage);
        }
    };

    // --- RENDER ---

    const renderRightActions = (id: number) => (
        <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)}>
            <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
    );

    const renderSpotValues = ({ item }: { item: Spot }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <Card style={styles.reportCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text style={TYPOGRAPHY.h3}>{item.address}</Text>
                        <Text style={TYPOGRAPHY.caption}>{new Date(item.reported_at).toLocaleTimeString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, item.status === 'verified' && { backgroundColor: COLORS.success }]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
            </Card>
        </Swipeable>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={TYPOGRAPHY.h1}>My Reports</Text>
                    <TouchableOpacity onPress={startReporting} style={styles.miniFab}>
                        <Text style={{ fontSize: 24 }}>➕</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    contentContainerStyle={{ padding: SPACING.m }}
                    data={spots}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderSpotValues}
                    refreshing={refreshing}
                    onRefresh={loadSpots}
                    ListHeaderComponent={
                        <Card style={styles.promoCard} onPress={startReporting}>
                            <Text style={TYPOGRAPHY.h2}>Report a spot</Text>
                            <Text style={TYPOGRAPHY.body}>Earn credits by finding open parking.</Text>
                        </Card>
                    }
                />

                {/* Reporting Modal */}
                <Modal visible={isReporting} animationType="slide" presentationStyle="pageSheet">
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsReporting(false)}>
                                <Text style={TYPOGRAPHY.body}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={TYPOGRAPHY.h3}>
                                {reportStep === 'location' ? 'Pin Location' : reportStep === 'photo' ? 'Add Photo' : 'Confirm'}
                            </Text>
                            <View style={{ width: 50 }} />
                        </View>

                        {/* Step 1: Pin Location */}
                        {reportStep === 'location' && (
                            <View style={{ flex: 1 }}>
                                <View style={{ flex: 1 }}>
                                    <UnifiedMap
                                        style={StyleSheet.absoluteFillObject}
                                        showCenterMarker={true}
                                        onRegionChangeComplete={handleRegionChangeComplete}
                                        initialRegion={pinnedLocation ? {
                                            latitude: pinnedLocation.latitude,
                                            longitude: pinnedLocation.longitude,
                                            latitudeDelta: 0.002,
                                            longitudeDelta: 0.002
                                        } : undefined}
                                    />
                                </View>
                                <View style={styles.stepFooter}>
                                    <Text style={[TYPOGRAPHY.h3, { textAlign: 'center', marginBottom: SPACING.s }]}>
                                        {isGeocoding ? 'Locating...' : (pinnedAddress || 'Pin Location')}
                                    </Text>
                                    <Text style={[TYPOGRAPHY.caption, { textAlign: 'center', marginBottom: SPACING.m, color: COLORS.text.secondary }]}>
                                        Drag map to adjust
                                    </Text>
                                    <Button
                                        title="Confirm Location"
                                        onPress={() => setReportStep('photo')}
                                        disabled={isGeocoding}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Step 2: Camera */}
                        {reportStep === 'photo' && (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }}>
                                <Text style={[TYPOGRAPHY.h1, { marginBottom: SPACING.l }]}>Take a Photo</Text>
                                <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginBottom: SPACING.xl }]}>
                                    Help drivers identify the spot easily.
                                </Text>
                                <Button title="Open Camera" onPress={handleCamera} icon="📷" style={{ marginBottom: SPACING.m, width: 200 }} />
                                <Button title="Skip Photo" variant="ghost" onPress={() => setReportStep('confirm')} />
                            </View>
                        )}

                        {/* Step 3: Confirm */}
                        {reportStep === 'confirm' && (
                            <View style={{ flex: 1, padding: SPACING.l }}>
                                <Text style={TYPOGRAPHY.h2}>Summary</Text>
                                <View style={styles.summaryBox}>
                                    <Text style={TYPOGRAPHY.caption}>LOCATION</Text>
                                    <Text style={[TYPOGRAPHY.body, { marginBottom: SPACING.m }]}>{pinnedAddress}</Text>

                                    <Text style={TYPOGRAPHY.caption}>PHOTO</Text>
                                    {photoUri ? (
                                        <View>
                                            <Image source={{ uri: photoUri }} style={styles.previewImage} />
                                            <TouchableOpacity onPress={handleCamera} style={{ marginTop: SPACING.s }}>
                                                <Text style={{ color: COLORS.primary, textAlign: 'center' }}>Retake Photo</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={{ color: COLORS.text.secondary, fontStyle: 'italic' }}>No photo added</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }} />
                                <Button title="Submit Report" onPress={handleSubmit} />
                            </View>
                        )}
                    </View>
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        padding: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    miniFab: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small
    },
    promoCard: {
        backgroundColor: COLORS.secondary,
        padding: SPACING.l,
        marginBottom: SPACING.l,
    },
    reportCard: { backgroundColor: COLORS.card, marginBottom: SPACING.s },
    statusBadge: {
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: COLORS.border
    },
    statusText: { ...TYPOGRAPHY.small, fontWeight: '700', fontSize: 10 },
    deleteAction: {
        backgroundColor: COLORS.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        marginBottom: SPACING.s,
        borderTopRightRadius: RADIUS.m,
        borderBottomRightRadius: RADIUS.m,
    },
    deleteText: { color: 'white', fontWeight: '600' },
    modalContainer: { flex: 1, backgroundColor: COLORS.card },
    modalHeader: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    stepFooter: {
        padding: SPACING.l,
        backgroundColor: COLORS.card,
        ...SHADOWS.large
    },
    summaryBox: {
        marginTop: SPACING.m,
        padding: SPACING.m,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.background
    }
});
