import React from 'react';
// Web implementation uses Leaflet
// We lazy load it or use the existing WebMap component
const WebMap = require('./WebMap').default;

export interface UnifiedMapProps {
    initialRegion?: {
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
    userLocation,
    destinationCoords,
    spotLocation,
    radius = 500,
    style,
    availableSpots,
}: UnifiedMapProps) {
    // Transform props to match what WebMap expects
    const markers: any[] = [];

    if (userLocation) {
        markers.push({ position: userLocation, title: 'You', color: 'blue' });
    }

    if (destinationCoords) {
        markers.push({ position: destinationCoords, title: 'Destination', color: 'green' });
    }

    if (spotLocation) {
        markers.push({ position: spotLocation, title: 'Parking Spot', color: 'orange' });
    }

    if (availableSpots) {
        availableSpots.forEach(spot => {
            markers.push({
                position: { latitude: spot.latitude, longitude: spot.longitude },
                title: `Spot $${spot.price}`,
                color: 'red'
            });
        });
    }

    const center = spotLocation || destinationCoords || userLocation || { latitude: 37.7749, longitude: -122.4194 };
    const circle = destinationCoords ? { center: destinationCoords, radius } : undefined;

    return (
        <WebMap
            center={center}
            zoom={15}
            markers={markers}
            circle={circle}
            style={style}
        />
    );
}
