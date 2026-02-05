/**
 * Premium Driver Screen - Find Parking with Bottom Sheet & Filters
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Animated,
    Dimensions,
    Linking,
    PanResponder,
} from 'react-native';
import { locationService } from '../services/location';
import { requestAPI, spotAPI } from '../services/api';
import { Location, Match, Spot } from '../types';
import UnifiedMap from '../components/UnifiedMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 120;
const BOTTOM_SHEET_MID = SCREEN_HEIGHT * 0.4;
const BOTTOM_SHEET_MAX = SCREEN_HEIGHT * 0.75;

// Distance options in meters
const DISTANCE_OPTIONS = [
    { label: '0.5 mi', value: 804 },
    { label: '1 mi', value: 1609 },
    { label: '2 mi', value: 3218 },
    { label: '5 mi', value: 8046 },
];

export default function DriverScreen() {
    // Core state
    const [destination, setDestination] = useState('');
    const [destinationCoords, setDestinationCoords] = useState<Location | null>(null);
    const [userLocation, setUserLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(false);
    const [availableSpots, setAvailableSpots] = useState<Spot[]>([]);

    // Match state
    const [match, setMatch] = useState<Match | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(240);

    // Filter state
    const [maxPrice, setMaxPrice] = useState(15);
    const [maxDistance, setMaxDistance] = useState(3218); // 2 miles default
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Selection state
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    // Suggestions
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Photo modal
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // Bottom sheet animation
    const sheetPosition = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;
    const [sheetExpanded, setSheetExpanded] = useState(false);

    // Initialize
    useEffect(() => {
        getCurrentLocation();
        loadAvailableSpots();
        // Refresh spots every 30 seconds
        const interval = setInterval(loadAvailableSpots, 30000);
        return () => clearInterval(interval);
    }, []);

    // Match timer
    useEffect(() => {
        if (match) {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [match]);

    // Calculate distance between two coordinates
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Filtered spots based on price and distance
    const filteredSpots = useMemo(() => {
        if (!userLocation) return availableSpots;

        return availableSpots.filter(spot => {
            const distance = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                spot.latitude, spot.longitude
            );
            // Filter by distance
            if (distance > maxDistance) return false;
            // All spots pass (price filter would go here if spots had prices)
            return true;
        }).map(spot => ({
            ...spot,
            distance: calculateDistance(
                userLocation.latitude, userLocation.longitude,
                spot.latitude, spot.longitude
            )
        })).sort((a, b) => a.distance - b.distance);
    }, [availableSpots, userLocation, maxDistance, maxPrice]);

    const getCurrentLocation = async () => {
        try {
            const location = await locationService.getCurrentLocation();
            setUserLocation(location);
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadAvailableSpots = async () => {
        try {
            const spots = await spotAPI.getAvailableSpots();
            setAvailableSpots(spots);
            console.log('📍 Loaded', spots.length, 'available spots');
        } catch (error) {
            console.error('Error loading available spots:', error);
        }
    };

    const handleTextChange = async (text: string) => {
        setDestination(text);
        if (text.length > 2) {
            const results = await locationService.getSuggestions(text);
            setSuggestions(results);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (address: string) => {
        setDestination(address);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleFindParking = async () => {
        if (!destination) {
            Alert.alert('Error', 'Please enter a destination');
            return;
        }

        setLoading(true);
        try {
            const coords = await locationService.geocode(destination);
            if (!coords) {
                Alert.alert('Error', 'Could not find destination');
                setLoading(false);
                return;
            }

            setDestinationCoords(coords);

            const result = await requestAPI.createRequest(
                coords.latitude,
                coords.longitude,
                maxDistance,
                maxPrice,
                destination
            );

            if (result.match) {
                setMatch(result.match);
                setTimeRemaining(240);
                expandSheet();
            } else {
                Alert.alert('No Spots Found', 'No parking spots available near your destination.');
            }
        } catch (error: any) {
            console.error('Error finding parking:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to find parking');
        } finally {
            setLoading(false);
        }
    };

    const handleSpotSelect = (spot: Spot & { distance?: number }) => {
        setSelectedSpot(spot);
        expandSheet();
    };

    const handleNavigate = (spot: Spot) => {
        const url = `maps://app?daddr=${spot.latitude},${spot.longitude}`;
        Linking.openURL(url).catch(() => {
            // Fallback to Google Maps
            Linking.openURL(`https://maps.google.com/maps?daddr=${spot.latitude},${spot.longitude}`);
        });
    };

    const handleVerify = async (found: boolean) => {
        if (!match) return;

        setLoading(true);
        try {
            await requestAPI.verifyMatch(match.id, found);
            if (found) {
                Alert.alert('🎉 Success!', 'Enjoy your parking spot!');
            } else {
                Alert.alert('Spot Not Found', 'We\'ll find you another spot.');
            }
            setMatch(null);
            setSelectedSpot(null);
            loadAvailableSpots();
        } catch (error: any) {
            Alert.alert('Error', 'Failed to verify spot');
        } finally {
            setLoading(false);
        }
    };

    const expandSheet = () => {
        Animated.spring(sheetPosition, {
            toValue: BOTTOM_SHEET_MID,
            useNativeDriver: false,
        }).start();
        setSheetExpanded(true);
    };

    const collapseSheet = () => {
        Animated.spring(sheetPosition, {
            toValue: BOTTOM_SHEET_MIN,
            useNativeDriver: false,
        }).start();
        setSheetExpanded(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDistance = (meters: number) => {
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1609).toFixed(1)} mi`;
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return `${Math.floor(diffMins / 60)}h ago`;
    };

    // Render spot card in bottom sheet
    const renderSpotCard = ({ item }: { item: Spot & { distance?: number } }) => {
        const isSelected = selectedSpot?.id === item.id;
        return (
            <TouchableOpacity
                style={[styles.spotCard, isSelected && styles.spotCardSelected]}
                onPress={() => handleSpotSelect(item)}
            >
                <View style={styles.spotCardHeader}>
                    <View style={styles.pricePill}>
                        <Text style={styles.priceText}>$3</Text>
                    </View>
                    <View style={styles.spotMeta}>
                        <Text style={styles.spotType}>🅿️ Street</Text>
                        <Text style={styles.spotTime}>{getTimeAgo(item.reported_at)}</Text>
                    </View>
                </View>

                <Text style={styles.spotAddress} numberOfLines={2}>
                    {item.address || 'Parking spot available'}
                </Text>

                <View style={styles.spotCardFooter}>
                    <Text style={styles.spotDistance}>
                        📍 {item.distance ? formatDistance(item.distance) : '—'}
                    </Text>
                    {isSelected && (
                        <TouchableOpacity
                            style={styles.navigateButton}
                            onPress={() => handleNavigate(item)}
                        >
                            <Text style={styles.navigateButtonText}>Navigate →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {item.photo_url && (
                    <View style={styles.photoIndicator}>
                        <Text style={styles.photoIndicatorText}>📷</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Filter Modal
    const renderFilterModal = () => (
        <Modal
            visible={showFilterModal}
            transparent
            animationType="slide"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.filterModalContent}>
                    <Text style={styles.filterModalTitle}>Filters</Text>

                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Max Price: ${maxPrice}</Text>
                        <View style={styles.sliderTrack}>
                            {[5, 10, 15, 20, 25, 30].map((price) => (
                                <TouchableOpacity
                                    key={price}
                                    style={[
                                        styles.priceChip,
                                        maxPrice === price && styles.priceChipSelected
                                    ]}
                                    onPress={() => setMaxPrice(price)}
                                >
                                    <Text style={[
                                        styles.priceChipText,
                                        maxPrice === price && styles.priceChipTextSelected
                                    ]}>${price}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Max Distance</Text>
                        <View style={styles.sliderTrack}>
                            {DISTANCE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.priceChip,
                                        maxDistance === option.value && styles.priceChipSelected
                                    ]}
                                    onPress={() => setMaxDistance(option.value)}
                                >
                                    <Text style={[
                                        styles.priceChipText,
                                        maxDistance === option.value && styles.priceChipTextSelected
                                    ]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.filterDoneButton}
                        onPress={() => setShowFilterModal(false)}
                    >
                        <Text style={styles.filterDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // If we have an active match, show verification UI
    if (match) {
        return (
            <View style={styles.container}>
                <View style={styles.matchContainer}>
                    <View style={styles.matchHeader}>
                        <Text style={styles.matchTitle}>🎯 Spot Found!</Text>
                        <View style={styles.timerBadge}>
                            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        </View>
                    </View>

                    <UnifiedMap
                        style={styles.matchMap}
                        initialRegion={{
                            latitude: match.spot.latitude,
                            longitude: match.spot.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        spotLocation={{ latitude: match.spot.latitude, longitude: match.spot.longitude }}
                        spotAddress={match.spot.address || undefined}
                        userLocation={userLocation}
                    />

                    <View style={styles.matchDetails}>
                        <View style={styles.matchPricePill}>
                            <Text style={styles.matchPriceText}>${match.amount.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.matchAddress}>{match.spot.address || 'Parking spot'}</Text>
                        <Text style={styles.matchDistance}>
                            📍 {formatDistance(match.distance_meters)} away
                        </Text>

                        {match.spot.photo_url && (
                            <TouchableOpacity
                                style={styles.photoPreview}
                                onPress={() => setShowPhotoModal(true)}
                            >
                                <Image
                                    source={{ uri: match.spot.photo_url }}
                                    style={styles.photoThumbnail}
                                    resizeMode="cover"
                                />
                                <Text style={styles.viewPhotoText}>Tap to view photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.matchActions}>
                        <TouchableOpacity
                            style={styles.navigateFullButton}
                            onPress={() => handleNavigate(match.spot)}
                        >
                            <Text style={styles.navigateFullButtonText}>🧭 Navigate</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.verifyActions}>
                        <TouchableOpacity
                            style={[styles.verifyButton, styles.verifyFoundButton]}
                            onPress={() => handleVerify(true)}
                            disabled={loading}
                        >
                            <Text style={styles.verifyButtonText}>✅ Found It</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.verifyButton, styles.verifyNotFoundButton]}
                            onPress={() => handleVerify(false)}
                            disabled={loading}
                        >
                            <Text style={styles.verifyNotFoundText}>❌ Not There</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Photo Modal */}
                <Modal visible={showPhotoModal} transparent animationType="fade">
                    <View style={styles.photoModalOverlay}>
                        <TouchableOpacity
                            style={styles.photoModalClose}
                            onPress={() => setShowPhotoModal(false)}
                        >
                            <Text style={styles.photoModalCloseText}>✕ Close</Text>
                        </TouchableOpacity>
                        {match.spot.photo_url && (
                            <Image
                                source={{ uri: match.spot.photo_url }}
                                style={styles.photoModalImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>
            </View>
        );
    }

    // Main search UI
    return (
        <View style={styles.container}>
            {/* Map takes full screen */}
            {userLocation ? (
                <UnifiedMap
                    style={styles.fullMap}
                    initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }}
                    userLocation={userLocation}
                    destinationCoords={destinationCoords}
                    availableSpots={filteredSpots}
                />
            ) : (
                <View style={styles.mapLoading}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.mapLoadingText}>Loading map...</Text>
                </View>
            )}

            {/* Search Bar Overlay */}
            <View style={styles.searchOverlay}>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Where are you heading?"
                        placeholderTextColor="#999"
                        value={destination}
                        onChangeText={handleTextChange}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={styles.suggestionsDropdown}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSelectSuggestion(item)}
                                    >
                                        <Text numberOfLines={1} style={styles.suggestionText}>📍 {item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>

                {/* Filter Chips */}
                <View style={styles.filterChips}>
                    <TouchableOpacity
                        style={styles.filterChip}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Text style={styles.filterChipText}>💰 Max ${maxPrice}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.filterChip}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Text style={styles.filterChipText}>
                            📍 {DISTANCE_OPTIONS.find(d => d.value === maxDistance)?.label}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.filterChipRefresh}
                        onPress={loadAvailableSpots}
                    >
                        <Text style={styles.filterChipText}>🔄</Text>
                    </TouchableOpacity>
                </View>

                {/* Find Button */}
                <TouchableOpacity
                    style={[styles.findButton, loading && styles.findButtonDisabled]}
                    onPress={handleFindParking}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.findButtonText}>🔍 Find Parking</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet */}
            <Animated.View style={[styles.bottomSheet, { height: sheetPosition }]}>
                <TouchableOpacity
                    style={styles.sheetHandle}
                    onPress={sheetExpanded ? collapseSheet : expandSheet}
                >
                    <View style={styles.handleBar} />
                </TouchableOpacity>

                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>
                        {filteredSpots.length} Spots Nearby
                    </Text>
                    <TouchableOpacity onPress={() => setShowFilterModal(true)}>
                        <Text style={styles.sheetFilterLink}>Filters</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={filteredSpots}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSpotCard}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.spotList}
                />
            </Animated.View>

            {/* Filter Modal */}
            {renderFilterModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    fullMap: {
        flex: 1,
    },
    mapLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    mapLoadingText: {
        marginTop: 10,
        color: '#666',
    },

    // Search Overlay
    searchOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
    },
    searchBar: {
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    searchInput: {
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    suggestionsDropdown: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        maxHeight: 200,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionText: {
        fontSize: 14,
        color: '#333',
    },

    // Filter Chips
    filterChips: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 8,
    },
    filterChip: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    filterChipRefresh: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    filterChipText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },

    // Find Button
    findButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    findButtonDisabled: {
        opacity: 0.7,
    },
    findButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    sheetFilterLink: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },

    // Spot Cards
    spotList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    spotCard: {
        width: 200,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    spotCardSelected: {
        borderColor: '#007AFF',
    },
    spotCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pricePill: {
        backgroundColor: '#34C759',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priceText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    spotMeta: {
        alignItems: 'flex-end',
    },
    spotType: {
        fontSize: 11,
        color: '#666',
    },
    spotTime: {
        fontSize: 10,
        color: '#999',
    },
    spotAddress: {
        fontSize: 13,
        color: '#333',
        marginBottom: 8,
    },
    spotCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spotDistance: {
        fontSize: 12,
        color: '#666',
    },
    navigateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    navigateButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    photoIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    photoIndicatorText: {
        fontSize: 14,
    },

    // Filter Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    },
    filterModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    sliderTrack: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    priceChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    priceChipSelected: {
        backgroundColor: '#007AFF',
    },
    priceChipText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    priceChipTextSelected: {
        color: '#fff',
    },
    filterDoneButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    filterDoneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Match View
    matchContainer: {
        flex: 1,
        padding: 16,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    matchTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    timerBadge: {
        backgroundColor: '#FF9500',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    matchMap: {
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    matchDetails: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    matchPricePill: {
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    matchPriceText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    matchAddress: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    matchDistance: {
        fontSize: 14,
        color: '#666',
    },
    photoPreview: {
        marginTop: 12,
    },
    photoThumbnail: {
        width: '100%',
        height: 120,
        borderRadius: 8,
    },
    viewPhotoText: {
        fontSize: 12,
        color: '#007AFF',
        textAlign: 'center',
        marginTop: 4,
    },
    matchActions: {
        marginBottom: 16,
    },
    navigateFullButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    navigateFullButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    verifyActions: {
        flexDirection: 'row',
        gap: 12,
    },
    verifyButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    verifyFoundButton: {
        backgroundColor: '#34C759',
    },
    verifyNotFoundButton: {
        backgroundColor: '#f0f0f0',
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    verifyNotFoundText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },

    // Photo Modal
    photoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoModalClose: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
    photoModalCloseText: {
        color: '#fff',
        fontSize: 16,
    },
    photoModalImage: {
        width: '100%',
        height: '70%',
    },
});
