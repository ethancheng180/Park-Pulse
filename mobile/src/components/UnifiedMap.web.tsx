import React from 'react';
// Web implementation uses Leaflet
// We lazy load it or use the existing WebMap component
const WebMap = require('./WebMap').default;

interface MapProps {
    initialRegion?: any;
    userLocation?: any;
    destinationCoords?: any;
    spotLocation?: any;
    radius?: number;
    spotAddress?: string;
    style?: any;
    onRegionChangeComplete?: (region: any) => void;
    showCenterMarker?: boolean;
}

export default function UnifiedMap({
    userLocation,
    destinationCoords,
    spotLocation,
    radius = 500,
    style,
    onRegionChangeComplete, // Not fully implemented for web in this pass, but prop exists
    showCenterMarker,
}: MapProps) {
    // Transform props to match what WebMap expects
    const markers = [];

    if (userLocation) {
        markers.push({ position: userLocation, title: 'You', color: 'blue' });
    }

    if (destinationCoords) {
        markers.push({ position: destinationCoords, title: 'Destination', color: 'green' });
    }

    if (spotLocation) {
        markers.push({ position: spotLocation, title: 'Parking Spot', color: 'orange' });
    }

    const center = spotLocation || destinationCoords || userLocation;
    const circle = destinationCoords ? { center: destinationCoords, radius } : undefined;

    if (!center) return null;

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
