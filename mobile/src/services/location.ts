/**
 * Location service for GPS and geocoding
 */
import * as ExpoLocation from 'expo-location';
import { Location } from '../types';

export const locationService = {
    async requestPermission(): Promise<boolean> {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        return status === 'granted';
    },

    async getCurrentLocation(): Promise<Location> {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            throw new Error('Location permission denied');
        }

        const location = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.High,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    },

    async reverseGeocode(latitude: number, longitude: number): Promise<string> {
        try {
            const result = await ExpoLocation.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (result && result.length > 0) {
                const addr = result[0];
                // Build full address with street number
                const parts: string[] = [];

                // Include street number if available
                if (addr.streetNumber) {
                    parts.push(addr.streetNumber);
                }
                if (addr.street) {
                    parts.push(addr.street);
                }

                const streetAddress = parts.join(' ');
                const cityState = [addr.city, addr.region].filter(Boolean).join(', ');

                if (streetAddress && cityState) {
                    return `${streetAddress}, ${cityState}`;
                } else if (streetAddress) {
                    return streetAddress;
                } else if (cityState) {
                    return cityState;
                }
            }
            return 'Unknown location';
        } catch (error) {
            return 'Unknown location';
        }
    },

    async geocode(address: string): Promise<Location | null> {
        try {
            const result = await ExpoLocation.geocodeAsync(address);
            if (result && result.length > 0) {
                return {
                    latitude: result[0].latitude,
                    longitude: result[0].longitude,
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    async getSuggestions(query: string): Promise<string[]> {
        if (!query || query.length < 3) return [];

        try {
            // Use OpenStreetMap Nominatim API for autocomplete
            // Limit to 5 results, search globally but could restrict
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'ParkPulse/1.0' // Nominatim requires a User-Agent
                    }
                }
            );

            const data = await response.json();

            if (Array.isArray(data)) {
                return data.map((item: any) => item.display_name);
            }
            return [];
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }
    },
};
