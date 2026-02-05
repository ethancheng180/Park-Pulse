import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

// ... interface ...

// ... component ...

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    centerMarkerContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -15,
        marginTop: -35,
        zIndex: 10,
    },
    centerMarker: {
        fontSize: 40,
    }
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
    showCenterMarker,
}: MapProps) {
    return (
        <View style={[styles.container, style]}>
            <MapView
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                onRegionChangeComplete={onRegionChangeComplete}
            >
                {/* Native MapView has built-in user location, but we can add cutom markers too */}
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
                {spotLocation && (
                    <Marker
                        coordinate={spotLocation}
                        title="Parking Spot"
                        description={spotAddress}
                        pinColor="blue"
                    />
                )}
            </MapView>

            {showCenterMarker && (
                <View style={styles.centerMarkerContainer} pointerEvents="none">
                    <Text style={styles.centerMarker}>📍</Text>
                </View>
            )}
        </View>
    );
}


