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
                const address = result[0];
                return `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
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
};
