/**
 * Account Screen - iOS Grouped List Style
 * Updates:
 * - Wallet & Payment Section (Apple Pay + Cards)
 * - Local Mock State for Cards
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Switch,
    Alert,
    Modal
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { userAPI, authAPI } from '../services/api';
import { User } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme';
import { Button, Card } from '../components/Shared';

interface Props { onLogout: () => void; }

interface PaymentMethod {
    id: string;
    type: 'visa' | 'mastercard' | 'amex';
    last4: string;
    isDefault: boolean;
}

export default function AccountScreen({ onLogout }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [applePayEnabled, setApplePayEnabled] = useState(true);
    const [cards, setCards] = useState<PaymentMethod[]>([
        { id: '1', type: 'visa', last4: '4242', isDefault: true }
    ]);
    const [showAddCard, setShowAddCard] = useState(false);

    useEffect(() => {
        userAPI.getMe().then(setUser).catch(console.error);
    }, []);

    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: () => {
                    authAPI.logout();
                    onLogout();
                }
            }
        ]);
    };

    const handleAddCard = () => {
        // Mock API Call
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newCard: PaymentMethod = {
            id: Date.now().toString(),
            type: 'mastercard',
            last4: Math.floor(1000 + Math.random() * 9000).toString(),
            isDefault: false
        };
        setCards([...cards, newCard]);
        setShowAddCard(false);
        Alert.alert('Success', `Mastercard •••• ${newCard.last4} added successfully.`);
    };

    const handleDeleteCard = (id: string) => {
        Alert.alert('Remove Card', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setCards(cards.filter(c => c.id !== id)) }
        ]);
    };

    // iOS Grouped Section Component
    const Section = ({ title, children }: { title?: string, children: React.ReactNode }) => (
        <View style={styles.sectionContainer}>
            {title && <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>}
            <View style={styles.sectionBody}>
                {children}
            </View>
        </View>
    );

    // iOS List Row Component
    const Row = ({ label, value, isLast, onPress, destructive, icon }: any) => (
        <TouchableOpacity
            style={[styles.row, !isLast && styles.rowBorder]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {icon && <Text style={{ marginRight: 10, fontSize: 16 }}>{icon}</Text>}
                <Text style={[styles.rowLabel, destructive && { color: COLORS.error }]}>{label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {value && <Text style={styles.rowValue}>{value}</Text>}
                {onPress && <Text style={styles.chevron}>›</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.screenTitle}>Settings</Text>

                {/* Profile Section */}
                {user && (
                    <Section title="Profile">
                        <View style={styles.profileRow}>
                            <View style={styles.avatar}>
                                <Text style={{ fontSize: 24 }}>👤</Text>
                            </View>
                            <View>
                                <Text style={TYPOGRAPHY.h3}>{user.email}</Text>
                                <Text style={TYPOGRAPHY.caption}>{user.role.toUpperCase()}</Text>
                            </View>
                        </View>
                    </Section>
                )}

                {/* Stats Section */}
                <Section title="Reputation">
                    <Row label="Rating" value={`★ ${Number(user?.reputation?.rating || 5.0).toFixed(2)}`} />
                    <Row label="Reports" value={user?.reputation?.successful_reports || 0} />
                    <Row label="Member Since" value="2024" isLast />
                </Section>

                {/* Wallet Section */}
                <Section title="Wallet & Payment">
                    <TouchableOpacity
                        style={[styles.row, styles.rowBorder]}
                        activeOpacity={1}
                    >
                        <Text style={styles.rowLabel}>Apple Pay</Text>
                        <Switch
                            value={applePayEnabled}
                            onValueChange={setApplePayEnabled}
                            trackColor={{ false: COLORS.border, true: COLORS.success }}
                        />
                    </TouchableOpacity>

                    {cards.map((card, index) => (
                        <Row
                            key={card.id}
                            icon="💳"
                            label={`${card.type.toUpperCase()} •••• ${card.last4}`}
                            value={card.isDefault ? 'Default' : ''}
                            onPress={() => handleDeleteCard(card.id)}
                            isLast={index === cards.length - 1 && !showAddCard}
                        />
                    ))}

                    <Row
                        label="Add Payment Method"
                        onPress={() => setShowAddCard(true)}
                        isLast
                        icon="➕"
                    />
                </Section>

                {/* Account Section */}
                <Section title="Account">
                    <Row label="Balance" value={`$${Number(user?.balance || 0).toFixed(2)}`} onPress={() => { }} />
                    <Row label="Notifications" isLast onPress={() => { }} />
                </Section>

                {/* Destructive Section */}
                <Section>
                    <Row label="Log Out" destructive isLast onPress={handleLogout} />
                </Section>

                <Text style={styles.footerText}>ParkPulse v1.1.0 (Build 43)</Text>
            </ScrollView>

            {/* Mock Add Card Modal */}
            <Modal visible={showAddCard} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddCard(false)}>
                            <Text style={TYPOGRAPHY.body}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={TYPOGRAPHY.h3}>Add Card</Text>
                        <View style={{ width: 50 }} />
                    </View>
                    <View style={{ padding: SPACING.l, alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ fontSize: 50, marginBottom: SPACING.m }}>💳</Text>
                        <Text style={TYPOGRAPHY.h2}>Mock Payment</Text>
                        <Text style={[TYPOGRAPHY.body, { textAlign: 'center', marginVertical: SPACING.m, color: COLORS.text.secondary }]}>
                            This is a prototype. Tapping "Add Card" will simulate adding a random Mastercard.
                        </Text>
                        <Button title="Add Mock Card" onPress={handleAddCard} style={{ width: '100%' }} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background, // iOS Grouped Gray
    },
    screenTitle: {
        ...TYPOGRAPHY.h1,
        margin: SPACING.l,
        marginLeft: SPACING.l + 4,
    },
    sectionContainer: {
        marginBottom: SPACING.l,
    },
    sectionHeader: {
        ...TYPOGRAPHY.small,
        marginLeft: SPACING.l + 4,
        marginBottom: SPACING.s,
        color: COLORS.text.secondary,
    },
    sectionBody: {
        backgroundColor: COLORS.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        minHeight: 44,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
        marginLeft: SPACING.l, // Inset separator
    },
    rowLabel: {
        ...TYPOGRAPHY.body,
    },
    rowValue: {
        ...TYPOGRAPHY.body,
        color: COLORS.text.secondary,
        marginRight: SPACING.s,
    },
    chevron: {
        fontSize: 18,
        color: COLORS.text.tertiary,
        marginTop: -2,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.l,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    footerText: {
        textAlign: 'center',
        ...TYPOGRAPHY.small,
        color: COLORS.text.tertiary,
        marginTop: SPACING.s,
    },
    modalContainer: { flex: 1, backgroundColor: COLORS.card },
    modalHeader: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
});
