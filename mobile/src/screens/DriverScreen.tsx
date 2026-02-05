/**
 * Premium Driver Screen - Apple Maps Style
 * Updates:
 * - Robust Sync: Fetches latest data on refresh/focus
 * - Filters: Client-side filtering for immediate feedback
 * - Logging: Debug logs for verification
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Modal,
    Animated,
    Dimensions,
    Linking,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    PanResponder,
    TextInput,
    Keyboard,
    RefreshControl,
    Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { locationService } from '../services/location';
import { spotAPI } from '../services/api';
import { Spot, Location } from '../types';
import UnifiedMap from '../components/UnifiedMap';
import { COLORS, SPACING, SHADOWS, RADIUS, TYPOGRAPHY } from '../theme';
import { Button, SearchPill, FilterChip, Card } from '../components/Shared';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SNAP_TOP = SCREEN_HEIGHT * 0.15;
const SNAP_MID = SCREEN_HEIGHT * 0.55;
const SNAP_BOTTOM = SCREEN_HEIGHT - 130;

export default function DriverScreen() {
    // --- STATE ---
    // Data
    const [allSpots, setAllSpots] = useState<Spot[]>([]); // Source of Truth
    const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]); // View Model
    const [userLocation, setUserLocation] = useState<Location | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [maxPrice, setMaxPrice] = useState(15);
    const [showPriceFilter, setShowPriceFilter] = useState(false);
    // Radius in km? Assuming Mock is nearby, we'll just filter by basic distance if we had coords
    // For MVP, we'll keep it simple: Filter by PRICE and assume backend returned radius.

    // Search
    const [destination, setDestination] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Selection
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // --- ANIMATIONS ---
    const panY = useRef(new Animated.Value(SNAP_BOTTOM)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderMove: (_, gestureState) => panY.setValue(gestureState.moveY),
            onPanResponderRelease: (_, gestureState) => {
                const { moveY, vy } = gestureState;
                let target = SNAP_BOTTOM;
                if (moveY < SCREEN_HEIGHT * 0.35 || vy < -0.5) target = SNAP_TOP;
                else if (moveY < SCREEN_HEIGHT * 0.75 || vy < -0.2) target = SNAP_MID;

                Animated.spring(panY, {
                    toValue: target,
                    useNativeDriver: false,
                    friction: 6,
                    tension: 50,
                }).start();
            }
        })
    ).current;

    const snapTo = (value: number) => {
        Animated.spring(panY, {
            toValue: value,
            useNativeDriver: false,
            friction: 7,
        }).start();
    };

    // --- EFFECTS ---

    // Initial Load & Location
    useEffect(() => {
        getCurrentLocation();
        fetchSpots(); // Initial fetch
    }, []);

    // Re-fetch on Tab Focus to ensure we see Pulser updates
    useFocusEffect(
        useCallback(() => {
            fetchSpots();
        }, [])
    );

    // Filter Logic: Runs whenever allSpots or maxPrice changes
    useEffect(() => {
        applyFilters();
    }, [allSpots, maxPrice]);

    const getCurrentLocation = async () => {
        try {
            const loc = await locationService.getCurrentLocation();
            setUserLocation(loc);
        } catch (e) { console.error(e); }
    };

    const fetchSpots = async () => {
        setRefreshing(true);
        try {
            console.log('Fetching spots from backend...');
            const spots = await spotAPI.getAvailableSpots();

            // Enrich with mock prices if missing (deterministic based on ID)
            const enriched = spots.map(s => ({
                ...s,
                price: s.price ?? ((s.id * 7) % 15) + 5
            }));

            console.log(`Fetched ${enriched.length} spots.`);
            setAllSpots(enriched);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setRefreshing(false);
        }
    };

    const applyFilters = () => {
        // Filter by Price
        const filtered = allSpots.filter(s => {
            const price = s.price || 0;
            return price <= maxPrice;
        });
        console.log(`Applied filters: MaxPrice=${maxPrice}. Result: ${filtered.length} spots.`);
        setFilteredSpots(filtered);
    };

    // --- HANDLERS ---

    const handleSearchTextChange = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 2) {
            const results = await locationService.getSuggestions(text).catch(() => []);
            setSuggestions(results);
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectSuggestion = async (address: string) => {
        setDestination(address);
        setIsSearching(false);
        Keyboard.dismiss();

        // Mock navigation to coords
        const coords = await locationService.geocode(address);
        if (coords) {
            console.log('Navigating to destination:', coords);
            // In real app, animate map to coords
        }

        // Trigger a fresh fetch for the new area
        fetchSpots();
    };

    const handleSpotSelect = (spotId: number) => {
        const spot = filteredSpots.find(s => s.id === spotId);
        if (spot) {
            setSelectedSpot(spot);
            Haptics.selectionAsync();
            snapTo(SNAP_MID);
        }
    };

    // --- RENDER ---

    const renderSheetHandle = () => (
        <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
                <Text style={TYPOGRAPHY.h3}>
                    {selectedSpot ? 'Selected Spot' : `${filteredSpots.length} spots found`}
                </Text>
                {!selectedSpot && (
                    <TouchableOpacity onPress={fetchSpots}>
                        <Text style={{ color: COLORS.secondary, fontSize: 13 }}>Pull to refresh</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderSpotItem = ({ item }: { item: Spot }) => (
        <Card style={styles.spotCard} onPress={() => handleSpotSelect(item.id)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                    <Text style={TYPOGRAPHY.h3}>{item.address || 'Unknown'}</Text>
                    <Text style={[TYPOGRAPHY.body, { color: COLORS.success }]}>${item.price}</Text>
                </View>
                {item.photo_url && (
                    <Image source={{ uri: item.photo_url }} style={styles.thumb} />
                )}
            </View>
        </Card>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Map */}
            <UnifiedMap
                style={StyleSheet.absoluteFillObject}
                userLocation={userLocation}
                availableSpots={filteredSpots}
                selectedSpotId={selectedSpot?.id}
                onSpotSelect={handleSpotSelect}
                initialRegion={userLocation ? {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                } : undefined}
            />

            {/* Top Search & Filter */}
            {!isSearching && (
                <SafeAreaView style={styles.topContainer}>
                    <SearchPill
                        placeholder={destination || "Search destination"}
                        value={destination}
                        onPress={() => {
                            setSearchQuery(destination);
                            setIsSearching(true);
                        }}
                    />
                    <View style={styles.filterRow}>
                        <FilterChip
                            label={`Max $${maxPrice}`}
                            onPress={() => setShowPriceFilter(true)}
                            selected={true}
                        />
                        <TouchableOpacity style={styles.refreshBadge} onPress={fetchSpots}>
                            <Text style={{ fontSize: 12 }}>🔄</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}

            {/* Expanded Search Overlay */}
            {isSearching && (
                <View style={styles.searchOverlay}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.searchHeader}>
                            <View style={styles.searchInputContainer}>
                                <Text style={styles.searchIcon}>🔍</Text>
                                <TextInput
                                    autoFocus
                                    style={styles.searchInput}
                                    placeholder="Search destination"
                                    value={searchQuery}
                                    onChangeText={handleSearchTextChange}
                                    placeholderTextColor={COLORS.text.tertiary}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Text style={{ color: COLORS.text.secondary }}>✕</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                onPress={() => setIsSearching(false)}
                                style={{ width: 80 }}
                            />
                        </View>
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item, index) => index.toString()}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(item)}
                                >
                                    <View style={styles.pinIcon}><Text>📍</Text></View>
                                    <Text style={TYPOGRAPHY.body}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </SafeAreaView>
                </View>
            )}

            {/* Bottom Sheet */}
            <Animated.View style={[styles.bottomSheet, { top: panY }]}>
                {renderSheetHandle()}
                <View style={styles.sheetContent}>
                    {selectedSpot ? (
                        <View style={{ padding: SPACING.m }}>
                            <Card>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={TYPOGRAPHY.h2}>Spot Details</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <View style={{ backgroundColor: COLORS.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                                                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>ACTIVE</Text>
                                            </View>
                                            <Text style={TYPOGRAPHY.caption}>
                                                Ends in {Math.ceil((new Date(selectedSpot.expires_at).getTime() - Date.now()) / 60000)}m
                                            </Text>
                                        </View>
                                    </View>
                                    <View>
                                        <Text style={[TYPOGRAPHY.h3, { color: COLORS.success }]}>${selectedSpot.price}</Text>
                                    </View>
                                </View>

                                <View style={{ marginVertical: SPACING.m }}>
                                    <Text style={TYPOGRAPHY.body}>{selectedSpot.address}</Text>
                                    <Text style={TYPOGRAPHY.caption}>Confidence: High • Reported 2m ago</Text>
                                </View>

                                {selectedSpot.photo_url ? (
                                    <TouchableOpacity onPress={() => setShowPhotoModal(true)}>
                                        <Image
                                            source={{ uri: selectedSpot.photo_url }}
                                            style={styles.fullImage}
                                        />
                                        <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 15 }}>
                                            <Text style={{ color: 'white', fontSize: 12 }}>🔍 Tap to expand</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[styles.fullImage, { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 40 }}>🅿️</Text>
                                        <Text style={[TYPOGRAPHY.caption, { marginTop: 8 }]}>No photo provided</Text>
                                    </View>
                                )}

                                <Button
                                    title="Navigate to Spot"
                                    style={{ marginTop: SPACING.m }}
                                    onPress={() => {
                                        const scheme = Platform.select({ ios: 'maps://?daddr=', android: 'google.navigation:q=' });
                                        const link = `${scheme}${selectedSpot.latitude},${selectedSpot.longitude}`;
                                        Linking.openURL(link);
                                    }}
                                />
                                <Button
                                    title="Close"
                                    variant="outline"
                                    style={{ marginTop: SPACING.s }}
                                    onPress={() => { setSelectedSpot(null); snapTo(SNAP_BOTTOM); }}
                                />
                            </Card>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredSpots}
                            keyExtractor={i => i.id.toString()}
                            renderItem={renderSpotItem}
                            contentContainerStyle={{ paddingBottom: 400 }}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={fetchSpots} />
                            }
                        />
                    )}
                </View>
            </Animated.View>

            {/* Price Filter Modal (Native-ish Sheet) */}
            <Modal visible={showPriceFilter} animationType="fade" transparent>
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowPriceFilter(false)}
                >
                    <View style={styles.filterSheet}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={TYPOGRAPHY.h3}>Max Price</Text>
                            <Text style={[TYPOGRAPHY.h3, { color: COLORS.secondary }]}>${maxPrice}</Text>
                        </View>

                        <View style={{ height: 40 }} />

                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={30}
                            step={1}
                            value={maxPrice}
                            onValueChange={(val: number) => {
                                setMaxPrice(val);
                                if (val % 5 === 0) Haptics.selectionAsync();
                            }}
                            minimumTrackTintColor={COLORS.secondary}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor="white"
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Text style={TYPOGRAPHY.caption}>$0</Text>
                            <Text style={TYPOGRAPHY.caption}>$30+</Text>
                        </View>

                        <Button title="Done" onPress={() => setShowPriceFilter(false)} style={{ marginTop: SPACING.l }} />
                    </View>
                </TouchableOpacity>
            </Modal>
            {/* Full Screen Photo Modal */}
            <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
                        onPress={() => setShowPhotoModal(false)}
                    >
                        <Text style={{ color: 'white', fontSize: 30 }}>✕</Text>
                    </TouchableOpacity>
                    {selectedSpot?.photo_url && (
                        <Image
                            source={{ uri: selectedSpot.photo_url }}
                            style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    topContainer: { margin: SPACING.m, zIndex: 10 },
    filterRow: { flexDirection: 'row', marginTop: SPACING.s, alignItems: 'center' },
    refreshBadge: {
        backgroundColor: COLORS.card,
        padding: 8,
        borderRadius: RADIUS.round,
        ...SHADOWS.small,
        marginLeft: SPACING.s
    },

    // Search Overlay
    searchOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background,
        zIndex: 20,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        height: 40,
        borderRadius: RADIUS.s,
        paddingHorizontal: SPACING.s,
    },
    searchInput: { flex: 1, marginLeft: SPACING.s, ...TYPOGRAPHY.body, fontSize: 16 },
    searchIcon: { opacity: 0.5 },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.l,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
    },
    pinIcon: { width: 30, alignItems: 'center', marginRight: SPACING.s },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.card,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        ...SHADOWS.large,
        height: SCREEN_HEIGHT,
    },
    sheetHandleContainer: { height: 40, alignItems: 'center', paddingTop: SPACING.s },
    sheetHandle: { width: 40, height: 5, backgroundColor: COLORS.border, borderRadius: 100 },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.s,
        paddingHorizontal: SPACING.m,
        width: '100%',
    },
    sheetContent: { flex: 1 },

    // Spot
    spotCard: { marginBottom: SPACING.s },
    thumb: { width: 50, height: 50, borderRadius: RADIUS.s, backgroundColor: COLORS.background },
    fullImage: { width: '100%', height: 200, borderRadius: RADIUS.m, marginTop: SPACING.m },

    // Filter Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    filterSheet: {
        backgroundColor: COLORS.card,
        padding: SPACING.xl,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: 40,
    },
    sliderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.m,
    },
    priceStep: {
        padding: 10,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.m,
        ...SHADOWS.small
    },
    priceStepText: { fontWeight: '600' },
    priceStepSelected: { backgroundColor: COLORS.primary }
});
