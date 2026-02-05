import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../theme';

interface ParkPulseMarkerProps {
    price: number;
    isSelected: boolean;
    isCluster?: boolean;
    clusterCount?: number;
}

export const ParkPulseMarker = ({ price, isSelected, isCluster, clusterCount }: ParkPulseMarkerProps) => {

    if (isCluster) {
        return (
            <View style={[styles.clusterContainer, isSelected && styles.selectedScale]}>
                <Text style={styles.clusterText}>{clusterCount}</Text>
            </View>
        );
    }

    // "P" Logo + Price Pill

    return (
        <View style={[
            styles.container,
            isSelected ? styles.selectedContainer : styles.defaultContainer
        ]}>
            <View style={[styles.iconBadge, isSelected && { backgroundColor: COLORS.primary }]}>
                <Text style={[styles.iconText, isSelected && { color: COLORS.text.inverse }]}>P</Text>
            </View>
            <Text style={[
                styles.priceText,
                isSelected ? { color: COLORS.text.inverse } : { color: COLORS.text.primary }
            ]}>
                ${price}
            </Text>
            {/* Pointer Triangle */}
            <View style={[
                styles.pointer,
                isSelected ? { borderTopColor: COLORS.primary } : { borderTopColor: COLORS.card }
            ]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 20, // Pill shape
        ...SHADOWS.small,
        minWidth: 50,
        height: 36,
        marginBottom: 4 // Space for pointer
    },
    defaultContainer: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedContainer: {
        backgroundColor: COLORS.primary,
        transform: [{ scale: 1.15 }], // Pop effect
        zIndex: 999,
        ...SHADOWS.medium,
    },
    iconBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
        marginLeft: -2,
    },
    iconText: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.primary,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '700',
    },
    pointer: {
        position: 'absolute',
        bottom: -6,
        left: '50%',
        marginLeft: -6,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },

    // Cluster
    clusterContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.card,
        ...SHADOWS.small
    },
    clusterText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16
    },
    selectedScale: {
        transform: [{ scale: 1.2 }],
    }
});
