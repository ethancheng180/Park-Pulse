/**
 * WebMap - Leaflet map component for web platform
 * Uses OpenStreetMap tiles (free, no API key needed)
 */
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for different marker types
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const blueIcon = createCustomIcon('#007AFF');
const greenIcon = createCustomIcon('#34C759');
const redIcon = createCustomIcon('#FF3B30');
const orangeIcon = createCustomIcon('#FF9500');

interface Location {
    latitude: number;
    longitude: number;
}

interface WebMapProps {
    center: Location;
    zoom?: number;
    markers?: Array<{
        position: Location;
        title?: string;
        color?: 'blue' | 'green' | 'red' | 'orange';
    }>;
    circle?: {
        center: Location;
        radius: number; // meters
    };
    style?: React.CSSProperties;
    onMapClick?: (location: Location) => void;
}

// Component to handle map center changes
function MapCenterHandler({ center }: { center: Location }) {
    const map = useMap();
    React.useEffect(() => {
        map.setView([center.latitude, center.longitude]);
    }, [center.latitude, center.longitude, map]);
    return null;
}

export default function WebMap({
    center,
    zoom = 15,
    markers = [],
    circle,
    style,
    onMapClick,
}: WebMapProps) {
    const getIcon = (color?: string) => {
        switch (color) {
            case 'green': return greenIcon;
            case 'red': return redIcon;
            case 'orange': return orangeIcon;
            default: return blueIcon;
        }
    };

    return (
        <div style={{ height: '100%', width: '100%', minHeight: 300, ...style }}>
            <MapContainer
                center={[center.latitude, center.longitude]}
                zoom={zoom}
                style={{ height: '100%', width: '100%', borderRadius: 10 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterHandler center={center} />

                {markers.map((marker, index) => (
                    <Marker
                        key={index}
                        position={[marker.position.latitude, marker.position.longitude]}
                        icon={getIcon(marker.color)}
                    >
                        {marker.title && (
                            <Popup>
                                <span>{marker.title}</span>
                            </Popup>
                        )}
                    </Marker>
                ))}

                {circle && (
                    <Circle
                        center={[circle.center.latitude, circle.center.longitude]}
                        radius={circle.radius}
                        pathOptions={{
                            color: '#007AFF',
                            fillColor: '#007AFF',
                            fillOpacity: 0.1,
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
