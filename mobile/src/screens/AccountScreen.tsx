/**
 * Account Tab - User profile, balance, reputation, and history
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { userAPI, authAPI } from '../services/api';
import { User, HistoryItem } from '../types';

interface AccountScreenProps {
    onLogout: () => void;
}

export default function AccountScreen({ onLogout }: AccountScreenProps) {
    const [user, setUser] = useState<User | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setRefreshing(true);
        setError(null);
        try {
            console.log('📱 AccountScreen: Loading user profile...');
            const [userData, historyData] = await Promise.all([
                userAPI.getMe(),
                userAPI.getHistory(),
            ]);
            console.log('✅ AccountScreen: Profile loaded successfully:', userData.email);
            setUser(userData);
            setHistory(historyData);
        } catch (err: any) {
            console.error('❌ AccountScreen: Error loading profile:', err);
            console.error('❌ Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            });
            setError(err.response?.data?.detail || err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        await authAPI.logout();
        onLogout();
    };

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Text key={i} style={styles.star}>
                    {i <= rating ? '★' : '☆'}
                </Text>
            );
        }
        return stars;
    };

    const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
        const icons: Record<string, string> = {
            spot: '📍',
            request: '🚗',
            payout: '💰',
        };

        return (
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyIcon}>{icons[item.type]}</Text>
                    <View style={styles.historyContent}>
                        <Text style={styles.historyType}>{item.type.toUpperCase()}</Text>
                        <Text style={styles.historyDate}>
                            {new Date(item.created_at).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.historyRight}>
                        {item.amount && (
                            <Text style={styles.historyAmount}>
                                ${Number(item.amount).toFixed(2)}
                            </Text>
                        )}
                        <View
                            style={[
                                styles.historyStatusBadge,
                                item.status === 'verified' && styles.statusSuccess,
                                item.status === 'failed' && styles.statusFailed,
                            ]}
                        >
                            <Text style={styles.historyStatusText}>{item.status}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Error loading profile</Text>
                <Text style={styles.errorMessage}>{error || 'Unknown error occurred'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryButtonText}>🔄 Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.profileSection}>
                    <Text style={styles.email}>{user.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Balance</Text>
                        <Text style={styles.statValue}>${Number(user.balance).toFixed(2)}</Text>
                    </View>

                    {user.reputation && (
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Reputation</Text>
                            <View style={styles.starsContainer}>
                                {renderStars(Math.round(Number(user.reputation.rating)))}
                            </View>
                            <Text style={styles.ratingValue}>{Number(user.reputation.rating).toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                {user.reputation && (
                    <View style={styles.reputationDetails}>
                        <Text style={styles.sectionTitle}>Performance</Text>
                        <View style={styles.reputationGrid}>
                            <View style={styles.reputationStat}>
                                <Text style={styles.reputationNumber}>
                                    {user.reputation.successful_reports}
                                </Text>
                                <Text style={styles.reputationLabel}>Successful</Text>
                            </View>
                            <View style={styles.reputationStat}>
                                <Text style={[styles.reputationNumber, styles.failedNumber]}>
                                    {user.reputation.failed_reports}
                                </Text>
                                <Text style={styles.reputationLabel}>Failed</Text>
                            </View>
                            <View style={styles.reputationStat}>
                                <Text style={styles.reputationNumber}>
                                    ${Number(user.reputation.total_earnings).toFixed(0)}
                                </Text>
                                <Text style={styles.reputationLabel}>Total Earned</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionTitle}>Transaction History</Text>
                        <TouchableOpacity onPress={loadData}>
                            <Text style={styles.refreshText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={history}
                        keyExtractor={(item, index) => `${item.id}-${item.type}-${index}`}
                        renderItem={renderHistoryItem}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        }
                    />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        backgroundColor: '#007AFF',
        padding: 30,
        alignItems: 'center',
    },
    email: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 15,
    },
    roleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#34C759',
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    star: {
        fontSize: 20,
        color: '#FFD700',
    },
    ratingValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    reputationDetails: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    reputationGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    reputationStat: {
        alignItems: 'center',
    },
    reputationNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#34C759',
        marginBottom: 5,
    },
    failedNumber: {
        color: '#FF3B30',
    },
    reputationLabel: {
        fontSize: 12,
        color: '#666',
    },
    historySection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    refreshText: {
        color: '#007AFF',
        fontSize: 14,
    },
    historyCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    historyIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 3,
    },
    historyDate: {
        fontSize: 12,
        color: '#999',
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#34C759',
        marginBottom: 5,
    },
    historyStatusBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    statusSuccess: {
        backgroundColor: '#34C759',
    },
    statusFailed: {
        backgroundColor: '#FF3B30',
    },
    historyStatusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
        fontSize: 14,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        margin: 20,
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Error state styles
    errorIcon: {
        fontSize: 48,
        marginBottom: 10,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 30,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
