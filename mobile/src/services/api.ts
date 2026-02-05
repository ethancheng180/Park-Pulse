/**
 * API client service for ParkPulse backend
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Spot, ParkingRequest, HistoryItem, LoginResponse } from '../types';
import { authEvents } from '../utils/authEvents';

// Use your computer's IP address instead of localhost for physical devices
// Fallback logic incase .env loading fails
const DEFAULT_API_URL = 'http://192.168.254.115:8000';
const API_BASE_URL = process.env.API_BASE_URL || DEFAULT_API_URL;

console.log('🌐 API Configuration:');
console.log('  API_BASE_URL from env:', process.env.API_BASE_URL);
console.log('  Using API_BASE_URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        console.log('🔵 API Request:', config.method?.toUpperCase(), config.url);
        console.log('🔵 Base URL:', config.baseURL);
        console.log('🔵 Full URL:', `${config.baseURL}${config.url}`);
        console.log('🔵 Request Data:', JSON.stringify(config.data, null, 2));

        const token = await AsyncStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 Token added to request');
        } else {
            console.log('⚠️  No token found in storage');
        }
        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
        return response;
    },
    async (error) => {
        console.error('❌ API Error Response:');
        console.error('  URL:', error.config?.url);
        console.error('  Method:', error.config?.method);
        console.error('  Status:', error.response?.status);
        console.error('  Status Text:', error.response?.statusText);
        console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('  Error Message:', error.message);

        if (error.code === 'ERR_NETWORK') {
            console.error('🔴 NETWORK ERROR: Cannot reach backend server');
            console.error('  Make sure backend is running at:', API_BASE_URL);
        }

        if (error.response?.status === 401) {
            console.log('🔒 Token expired, clearing storage');
            // Token expired, clear storage
            await AsyncStorage.removeItem('access_token');
            authEvents.emitLogout();
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    async login(email: string, password: string): Promise<string> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        const token = response.data.access_token;
        await AsyncStorage.setItem('access_token', token);
        return token;
    },

    async register(email: string, password: string, role: string): Promise<string> {
        const response = await api.post<LoginResponse>('/auth/register', { email, password, role });
        const token = response.data.access_token;
        await AsyncStorage.setItem('access_token', token);
        return token;
    },

    async logout(): Promise<void> {
        await AsyncStorage.removeItem('access_token');
    },

    async getToken(): Promise<string | null> {
        return await AsyncStorage.getItem('access_token');
    },

    async requestPasswordReset(email: string): Promise<void> {
        await api.post('/auth/password-reset-request', { email });
    },

    async findAccount(identifier: string): Promise<{ found: boolean; recovery_method?: string }> {
        const response = await api.post<{ found: boolean; recovery_method?: string }>(
            '/auth/find-account',
            { identifier }
        );
        return response.data;
    },

    async loginWithGoogle(idToken: string): Promise<string> {
        const response = await api.post<LoginResponse>('/auth/google', { idToken });
        const token = response.data.access_token;
        await AsyncStorage.setItem('access_token', token);
        return token;
    },
};

// User API
export const userAPI = {
    async getMe(): Promise<User> {
        const response = await api.get<User>('/users/me');
        return response.data;
    },

    async getHistory(): Promise<HistoryItem[]> {
        const response = await api.get<{ items: HistoryItem[] }>('/users/history');
        return response.data.items;
    },

    async submitAppeal(message: string): Promise<any> {
        const response = await api.post('/users/appeal', { message });
        return response.data;
    },
};

// Spot API
export const spotAPI = {
    async reportSpot(
        latitude: number,
        longitude: number,
        address?: string,
        photo_url?: string
    ): Promise<Spot> {
        const response = await api.post<Spot>('/spots', {
            latitude,
            longitude,
            address,
            photo_url,
        });
        return response.data;
    },

    async getMySpots(): Promise<Spot[]> {
        const response = await api.get<Spot[]>('/spots');
        return response.data;
    },

    async getAvailableSpots(): Promise<Spot[]> {
        const response = await api.get<Spot[]>('/spots/available');
        return response.data;
    },

    async deleteSpot(id: number): Promise<void> {
        await api.delete(`/spots/${id}`);
    },

    async claimSpot(id: number): Promise<Spot> {
        const response = await api.post<Spot>(`/spots/${id}/claim`);
        return response.data;
    },

    async markSpotTaken(id: number): Promise<Spot> {
        const response = await api.post<Spot>(`/spots/${id}/take`);
        return response.data;
    },

    async releaseSpot(id: number): Promise<Spot> {
        const response = await api.post<Spot>(`/spots/${id}/release`);
        return response.data;
    },
};

// Request API
export const requestAPI = {
    async createRequest(
        destination_latitude: number,
        destination_longitude: number,
        radius_meters: number,
        max_price: number,
        destination_address?: string
    ): Promise<ParkingRequest> {
        const response = await api.post<ParkingRequest>('/requests', {
            destination_latitude,
            destination_longitude,
            destination_address,
            radius_meters,
            max_price,
        });
        return response.data;
    },

    async verifySpot(match_id: number, found: boolean, notes?: string): Promise<any> {
        const response = await api.post('/requests/verify', {
            match_id,
            found,
            notes,
        });
        return response.data;
    },
};

export default api;
