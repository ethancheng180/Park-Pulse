import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SHADOWS, COLORS, RADIUS, TYPOGRAPHY } from '../theme';
import { ParkPulseMarker } from './ParkPulseMarker';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    priceMarker: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceMarkerSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        transform: [{ scale: 1.1 }],
        zIndex: 10,
    },
    priceText: {
        ...TYPOGRAPHY.h3,
        fontSize: 13,
        color: COLORS.text.primary,
    },
    priceTextSelected: {
        color: COLORS.text.inverse,
    },

    // User location dot (if we wanted custom)
    // Destination Pin
    destMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    destText: {
        fontSize: 32,
    },
});

interface MapProps {
    initialRegion: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    userLocation?: { latitude: number; longitude: number } | null;
    destinationCoords?: { latitude: number; longitude: number } | null;
    spotLocation?: { latitude: number; longitude: number } | null;
    radius?: number;
    spotAddress?: string;
    style?: any;
    onRegionChangeComplete?: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
    showCenterMarker?: boolean;
    availableSpots?: Array<{ id: number; latitude: number; longitude: number; address?: string; price?: number }>;
    selectedSpotId?: number | null;
    onSpotSelect?: (spotId: number) => void;
}

export default function UnifiedMap({
    initialRegion,
    userLocation,
    destinationCoords,
    spotLocation,
    radius = 500,
    spotAddress,
    style,
    onRegionChangeComplete,
    availableSpots = [],
    selectedSpotId,
    onSpotSelect,
    showCenterMarker,
}: MapProps) {
    const mapRef = useRef<MapView>(null);

    // Effect to animate to new regions if needed, but for MVP standard props work

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={false} // Custom button usually better
                showsCompass={false}
                onRegionChangeComplete={onRegionChangeComplete}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                rotateEnabled={false} // Uber style mostly fixed rotation
            >
                {/* Destination Circle & Marker */}
                {destinationCoords && (
                    <>
                        <Circle
                            center={destinationCoords}
                            radius={radius}
                            strokeColor="rgba(0,0,0,0.5)" // Uber style: black/gray stroke
                            fillColor="rgba(0,0,0,0.05)" // Very light fill
                        />
                        <Marker coordinate={destinationCoords} anchor={{ x: 0.5, y: 1 }}>
                            <View style={styles.destMarker}>
                                <Text style={styles.destText}>📍</Text>
                            </View>
                        </Marker>
                    </>
                )}

                {/* Single Spot Highlight (Match mode) */}
                {spotLocation && (
                    <Marker coordinate={spotLocation} title="Your Spot" anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={[styles.priceMarker, styles.priceMarkerSelected]}>
                            <Text style={styles.priceTextSelected}>P</Text>
                        </View>
                    </Marker>
                )}

                {/* Inventory Markers (Price Pills) */}
                {availableSpots.map((spot) => {
                    const isSelected = selectedSpotId === spot.id;
                    // Mock price if missing, or use id as seed for consistent mock
                    const displayPrice = spot.price || ((spot.id % 5) + 3);

                    return (
                        <Marker
                            key={`spot-${spot.id}`}
                            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                            onPress={() => onSpotSelect && onSpotSelect(spot.id)}
                            stopPropagation={true}
                            tracksViewChanges={false} // Optimization
                            zIndex={isSelected ? 100 : 1}
                        >
                            <ParkPulseMarker
                                price={displayPrice}
                                isSelected={isSelected}
                            />
                        </Marker>
                    );
                })}
            </MapView>

            {/* Center Pin Overlay (for Reporting) */}
            {showCenterMarker && (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                    <View style={{ marginBottom: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 40 }}>📍</Text>
                        <View style={{ width: 4, height: 4, backgroundColor: 'black', borderRadius: 2, marginTop: -5 }} />
                    </View>
                </View>
            )}
        </View>
    );
}


