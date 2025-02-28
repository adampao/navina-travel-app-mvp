import { 
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  GeoPoint,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// User related functions
export const createUser = async (userData) => {
  try {
    // Add created timestamp
    userData.createdAt = serverTimestamp();
    
    // Initialize user's preferences if not provided
    if (!userData.preferences) {
      userData.preferences = {
        languages: ['English'],
        interests: [],
        pace: 'moderate',
        accessibility: false,
        maxDistance: 5000,
      };
    }
    
    // Initialize empty arrays
    userData.savedTours = userData.savedTours || [];
    userData.savedPOIs = userData.savedPOIs || [];
    userData.history = userData.history || {
      completedTours: [],
      visitedPOIs: [],
    };
    
    const docRef = await addDoc(collection(db, 'users'), userData);
    return { id: docRef.id, ...userData };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { preferences, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// POI related functions
export const getPOIById = async (poiId) => {
  try {
    const poiDoc = await getDoc(doc(db, 'pois', poiId));
    if (poiDoc.exists()) {
      return { id: poiDoc.id, ...poiDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting POI:', error);
    throw error;
  }
};

export const getPOIsByIds = async (poiIds) => {
  try {
    const result = [];
    // Firestore doesn't support querying for multiple document IDs directly,
    // so we need to fetch them one by one
    for (const id of poiIds) {
      const poiDoc = await getDoc(doc(db, 'pois', id));
      if (poiDoc.exists()) {
        result.push({ id: poiDoc.id, ...poiDoc.data() });
      }
    }
    return result;
  } catch (error) {
    console.error('Error getting POIs by IDs:', error);
    throw error;
  }
};

export const getNearbyPOIs = async (latitude, longitude, radiusInMeters = 2000) => {
  try {
    // In a production app, you would use geoqueries or a spatial database
    // For this MVP, we'll get all POIs and filter client-side
    const poisRef = collection(db, 'pois');
    const querySnapshot = await getDocs(poisRef);
    
    const result = [];
    querySnapshot.forEach((doc) => {
      const poi = { id: doc.id, ...doc.data() };
      const distance = calculateDistance(
        latitude,
        longitude,
        poi.coordinates.latitude,
        poi.coordinates.longitude
      );
      
      // If within radius, add to results
      if (distance <= radiusInMeters) {
        poi.distance = distance; // Add distance for sorting
        result.push(poi);
      }
    });
    
    // Sort by distance
    return result.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error getting nearby POIs:', error);
    throw error;
  }
};

// Helper function to calculate distance between coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in meters
};

// Tour related functions
export const getTourById = async (tourId) => {
  try {
    const tourDoc = await getDoc(doc(db, 'tours', tourId));
    if (tourDoc.exists()) {
      return { id: tourDoc.id, ...tourDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting tour:', error);
    throw error;
  }
};

export const getRecommendedTours = async (userPreferences, location, limit = 5) => {
  try {
    // In a production app, you would have more sophisticated recommendation logic
    // For MVP, we'll just get tours that match user's language and sort by proximity
    const toursRef = collection(db, 'tours');
    const querySnapshot = await getDocs(toursRef);
    
    const result = [];
    querySnapshot.forEach((doc) => {
      const tour = { id: doc.id, ...doc.data() };
      
      // Check if tour matches user language preference
      const languageMatch = userPreferences.languages.some(lang => 
        tour.languages.includes(lang)
      );
      
      if (languageMatch) {
        // Calculate distance to first POI in tour as proximity measure
        if (location && tour.pois && tour.pois.length > 0) {
          // In real app, we'd fetch first POI and get its coordinates
          // For MVP, assume we have starting coordinates in the tour object
          const startCoordinates = tour.startCoordinates || { latitude: 0, longitude: 0 };
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            startCoordinates.latitude,
            startCoordinates.longitude
          );
          tour.distance = distance;
        }
        
        result.push(tour);
      }
    });
    
    // Sort by distance and limit results
    return result.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity)).slice(0, limit);
  } catch (error) {
    console.error('Error getting recommended tours:', error);
    throw error;
  }
};

// Conversation related functions
export const startNewConversation = async (userId, initialContext = {}) => {
  try {
    const conversationData = {
      userId,
      messages: [
        {
          id: Date.now().toString(),
          sender: 'system',
          content: 'Hello! I'm Navina, your personal travel guide. How can I help you today?',
          timestamp: serverTimestamp(),
        },
      ],
      context: initialContext,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'conversations'), conversationData);
    return { id: docRef.id, ...conversationData };
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw error;
  }
};

export const addMessageToConversation = async (conversationId, message, updatedContext = null) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }
    
    const conversation = conversationDoc.data();
    const updatedMessages = [...conversation.messages, {
      ...message,
      timestamp: serverTimestamp(),
    }];
    
    const update = {
      messages: updatedMessages,
      updatedAt: serverTimestamp(),
    };
    
    // Update context if provided
    if (updatedContext) {
      update.context = { ...conversation.context, ...updatedContext };
    }
    
    await updateDoc(conversationRef, update);
    
    return {
      id: conversationId,
      ...conversation,
      ...update,
    };
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
};

export const getConversationHistory = async (userId, limit = 10) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    return conversations;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
};