import React from 'react';
import { View, Text } from 'react-native';

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
    availableSpots?: Array<{ id: number; latitude: number; longitude: number; address?: string }>;
}

/**
 * Fallback UnifiedMap component for TypeScript resolution.
 * At runtime, Metro bundler will pick UnifiedMap.web.tsx or UnifiedMap.native.tsx
 */
export default function UnifiedMap(props: UnifiedMapProps) {
    return (
        <View style={props.style}>
            <Text>Map not supported on this platform</Text>
        </View>
    );
}
