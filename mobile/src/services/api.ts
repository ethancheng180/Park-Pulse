/**
 * API client service for ParkPulse backend
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Spot, ParkingRequest, HistoryItem, LoginResponse } from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired, clear storage
            await AsyncStorage.removeItem('access_token');
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
