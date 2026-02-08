/**
 * TypeScript interfaces for API types
 */

export interface User {
    id: number;
    email: string;
    role: 'driver' | 'pulser' | 'both';
    balance: number;
    reputation?: Reputation;
    banned: boolean;
    ban_reason?: string;
    appeal_status: 'none' | 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Reputation {
    rating: number;
    successful_reports: number;
    failed_reports: number;
    total_earnings: number;
    false_report_strikes: number;
}

export interface Spot {
    id: number;
    pulser_id: number;
    latitude: number;
    longitude: number;
    address?: string;
    photo_url?: string;
    reported_at: string;
    expires_at: string;
    price?: number;
    confidence?: 'Low' | 'Medium' | 'High';
    status: 'available' | 'matched' | 'verified' | 'expired' | 'failed' | 'claimed' | 'taken';
    claimed_by_user_id?: number;
    claimed_at?: string;
    claim_expires_at?: string;
    taken_confirmed_at?: string;
}

export interface Match {
    id: number;
    spot_id: number;
    distance_meters: number;
    amount: number;
    spot: Spot;
    stripe_client_secret?: string;
}

export interface ParkingRequest {
    id: number;
    status: string;
    match?: Match;
    created_at: string;
}

export interface HistoryItem {
    id: number;
    type: 'spot' | 'request' | 'payout';
    amount?: number;
    status: string;
    created_at: string;
    details?: any;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface Location {
    latitude: number;
    longitude: number;
}
