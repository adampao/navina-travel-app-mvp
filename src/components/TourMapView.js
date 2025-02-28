import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// This would come from your API/database
const mockPOIs = [
  {
    id: 'acropolis001',
    name: 'Acropolis',
    coordinates: {
      latitude: 37.9715,
      longitude: 23.7268,
    },
    description: 'Ancient citadel located on a rocky outcrop above the city of Athens',
    crowdLevel: 8, // 1-10 scale
  },
  {
    id: 'agora001',
    name: 'Ancient Agora',
    coordinates: {
      latitude: 37.9755,
      longitude: 23.7212,
    },
    description: 'The ancient marketplace and civic center',
    crowdLevel: 4,
  },
  {
    id: 'plaka001',
    name: 'Plaka District',
    coordinates: {
      latitude: 37.9692,
      longitude: 23.7276,
    },
    description: 'The oldest section of Athens, known for its historic buildings and restaurants',
    crowdLevel: 6,
  },
];

// Mock tour path
const mockTourPath = [
  { latitude: 37.9692, longitude: 23.7276 }, // Plaka starting point
  { latitude: 37.9705, longitude: 23.7265 },
  { latitude: 37.9725, longitude: 23.7258 },
  { latitude: 37.9745, longitude: 23.7235 },
  { latitude: 37.9755, longitude: 23.7212 }, // Agora
  { latitude: 37.9748, longitude: 23.7228 },
  { latitude: 37.9738, longitude: 23.7245 },
  { latitude: 37.9728, longitude: 23.7265 },
  { latitude: 37.9715, longitude: 23.7268 }, // Acropolis
];

// Get the crowd indicator color based on level
const getCrowdColor = (level) => {
  if (level <= 3) return '#22c55e'; // Green - low crowds
  if (level <= 6) return '#f59e0b'; // Amber - moderate crowds
  return '#ef4444'; // Red - high crowds
};

const TourMapView = ({ 
  tourId, 
  onPOISelect, 
  showCrowdIndicators = true,
  initialRegion = {
    latitude: 37.9715,
    longitude: 23.7268,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }
}) => {
  const [region, setRegion] = useState(initialRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const mapRef = useRef(null);
  const calloutAnimation = useRef(new Animated.Value(0)).current;

  // Mock loading tour data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Request and watch location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({});
      const userCoords = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      };
      setUserLocation(userCoords);
      
      if (isFollowingUser) {
        centerOnUser(userCoords);
      }

      // Set up location watcher
      const locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update when user has moved by 10 meters
        },
        (location) => {
          const newUserCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newUserCoords);
          
          if (isFollowingUser) {
            centerOnUser(newUserCoords);
          }
        }
      );

      return () => {
        if (locationWatcher) {
          locationWatcher.remove();
        }
      };
    })();
  }, [isFollowingUser]);

  // Animate callout when POI is selected
  useEffect(() => {
    if (selectedPOI) {
      Animated.timing(calloutAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      calloutAnimation.setValue(0);
    }
  }, [selectedPOI, calloutAnimation]);

  const centerOnUser = (coords) => {
    if (mapRef.current && coords) {
      mapRef.current.animateToRegion({
        ...coords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const handleMarkerPress = (poi) => {
    setSelectedPOI(poi);
    if (onPOISelect) {
      onPOISelect(poi);
    }
  };

  const toggleFollowUser = () => {
    const newFollowState = !isFollowingUser;
    setIsFollowingUser(newFollowState);
    
    if (newFollowState && userLocation) {
      centerOnUser(userLocation);
    }
  };

  const closeCallout = () => {
    setSelectedPOI(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.loadingImage}
        />
        <Text style={styles.loadingText}>Loading tour map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
      >
        {/* Tour path line */}
        <Polyline
          coordinates={mockTourPath}
          strokeWidth={4}
          strokeColor="#3b82f6"
          lineDashPattern={[1, 2]}
        />

        {/* POI markers */}
        {mockPOIs.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={poi.coordinates}
            title={poi.name}
            description={poi.description}
            onPress={() => handleMarkerPress(poi)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Ionicons name="location" size={28} color="#3b82f6" />
                {showCrowdIndicators && (
                  <View 
                    style={[
                      styles.crowdIndicator, 
                      { backgroundColor: getCrowdColor(poi.crowdLevel) }
                    ]}
                  />
                )}
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleFollowUser}
        >
          <Ionicons 
            name={isFollowingUser ? "navigate" : "navigate-outline"} 
            size={28} 
            color={isFollowingUser ? "#3b82f6" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {/* Selected POI Info Card */}
      {selectedPOI && (
        <Animated.View 
          style={[
            styles.poiCard,
            {
              transform: [
                {
                  translateY: calloutAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.poiCardHeader}>
            <Text style={styles.poiTitle}>{selectedPOI.name}</Text>
            <TouchableOpacity onPress={closeCallout} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.poiDescription}>{selectedPOI.description}</Text>
          
          <View style={styles.poiCardFooter}>
            {showCrowdIndicators && (
              <View style={styles.crowdLevelContainer}>
                <Text style={styles.crowdLevelLabel}>Current crowd level:</Text>
                <View style={styles.crowdLevelBar}>
                  {[...Array(10)].map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.crowdLevelSegment,
                        {
                          backgroundColor: index < selectedPOI.crowdLevel
                            ? getCrowdColor(selectedPOI.crowdLevel)
                            : '#e5e5e5'
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    position: 'relative',
  },
  crowdIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    top: 0,
    right: 0,
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  poiCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  poiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  poiDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  poiCardFooter: {
    flexDirection: 'column',
  },
  crowdLevelContainer: {
    marginBottom: 12,
  },
  crowdLevelLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  crowdLevelBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  crowdLevelSegment: {
    flex: 1,
    marginHorizontal: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
  },
  detailsButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default TourMapView;