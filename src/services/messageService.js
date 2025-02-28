import { addMessageToConversation } from './databaseService';

// For MVP, this uses a rule-based approach
// In production, this would connect to a backend NLP service like OpenAI
export const processUserMessage = async (conversationId, userMessage, context) => {
  try {
    // Add user message to conversation
    await addMessageToConversation(conversationId, {
      id: Date.now().toString(),
      sender: 'user',
      content: userMessage,
    });

    // Process message and generate response
    const response = await generateResponse(userMessage, context);
    
    // Add system response to conversation
    return await addMessageToConversation(
      conversationId,
      {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: response.content,
        relatedPOIs: response.relatedPOIs,
        relatedTours: response.relatedTours,
      },
      response.updatedContext
    );
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
};

// Mock response generation using rules
// In production, this would call an API endpoint that uses a language model
const generateResponse = async (message, context) => {
  // Normalize input for easier matching
  const input = message.toLowerCase().trim();
  
  // Track entities that might be extracted
  const extractedEntities = {
    locations: [],
    interests: [],
    timeframe: null,
  };
  
  // Extract potential locations
  const locationKeywords = [
    'acropolis', 'parthenon', 'temple', 'museum', 'agora', 
    'plaka', 'monastiraki', 'syntagma', 'athens', 'greece'
  ];
  
  locationKeywords.forEach(keyword => {
    if (input.includes(keyword)) {
      extractedEntities.locations.push(keyword);
    }
  });
  
  // Extract potential interests
  const interestKeywords = [
    'history', 'architecture', 'food', 'art', 'shopping', 
    'culture', 'local', 'ancient', 'modern', 'photography'
  ];
  
  interestKeywords.forEach(keyword => {
    if (input.includes(keyword)) {
      extractedEntities.interests.push(keyword);
    }
  });
  
  // Extract time references
  if (input.includes('morning') || input.includes('breakfast')) {
    extractedEntities.timeframe = 'morning';
  } else if (input.includes('afternoon') || input.includes('lunch')) {
    extractedEntities.timeframe = 'afternoon';
  } else if (input.includes('evening') || input.includes('dinner') || input.includes('night')) {
    extractedEntities.timeframe = 'evening';
  }
  
  // Initialize response
  let responseContent = '';
  let relatedPOIs = [];
  let relatedTours = [];
  let updatedContext = {};
  
  // Handle different types of queries
  if (input.includes('hello') || input.includes('hi ') || input.includes('hey')) {
    responseContent = `Hello! I'm your personal travel guide for Athens. I can help you discover historical sites, find interesting tours, or provide information about local attractions. What are you interested in exploring today?`;
  }
  else if (input.includes('crowd') || input.includes('busy') || input.includes('wait time')) {
    responseContent = `Based on current data, here are the crowd levels at popular attractions:\n\n- Acropolis: ${getRandomCrowdLevel()} (${getRecommendedTime('acropolis')})\n- Ancient Agora: ${getRandomCrowdLevel()} (${getRecommendedTime('agora')})\n- Plaka District: ${getRandomCrowdLevel()} (best in the evening)\n\nWould you like me to suggest a less crowded route?`;
    relatedPOIs = ['acropolis001', 'agora001', 'plaka001'];
  }
  else if (input.includes('tour') || input.includes('guide')) {
    if (extractedEntities.interests.length > 0) {
      const interest = extractedEntities.interests[0];
      responseContent = `I have several ${interest}-focused tours that might interest you. The "Athens ${capitalize(interest)} Explorer" is a popular 3-hour tour covering the main ${interest} sites in central Athens. Would you like more details about this tour?`;
      relatedTours = [`athens_${interest}_001`];
    } else {
      responseContent = `I can recommend several tours based on your interests. We have historical tours exploring ancient ruins, cultural tours featuring local traditions, food tours with authentic Greek cuisine, and art tours showcasing museums and galleries. What type of experience are you looking for?`;
      relatedTours = ['athens_history_001', 'athens_culture_001', 'athens_food_001', 'athens_art_001'];
    }
  }
  else if (extractedEntities.locations.length > 0) {
    const location = extractedEntities.locations[0];
    const poiInfo = getPOIInfo(location);
    responseContent = poiInfo.description;
    responseContent += `\n\nCurrent crowd level: ${getRandomCrowdLevel()}\nBest time to visit: ${poiInfo.bestTime}`;
    responseContent += `\n\nWould you like directions or more detailed information?`;
    relatedPOIs = [poiInfo.id];
    updatedContext = { lastPOI: poiInfo.id };
  }
  else if (input.includes('recommend') || input.includes('suggest') || input.includes('what should')) {
    if (extractedEntities.timeframe) {
      responseContent = `For a ${extractedEntities.timeframe} activity, I'd recommend ${getRecommendationByTime(extractedEntities.timeframe)}. Would you like more information about this?`;
    } else if (extractedEntities.interests.length > 0) {
      const interest = extractedEntities.interests[0];
      responseContent = `If you're interested in ${interest}, I'd recommend visiting ${getRecommendationByInterest(interest)}. Would you like to know more about this place?`;
    } else {
      responseContent = `I'd be happy to make some recommendations! Are you interested in historical sites, cultural experiences, local cuisine, or perhaps something off the beaten path?`;
    }
  }
  else if (input.includes('how') && (input.includes('get') || input.includes('go'))) {
    if (context.lastPOI) {
      responseContent = `To get to the ${getPOIInfo(context.lastPOI).name}, you can take the metro to ${getRandomMetroStation()} station and walk about 10 minutes. Alternatively, bus routes 040 and 230 stop nearby. Would you like me to show you the route on the map?`;
    } else if (extractedEntities.locations.length > 0) {
      const location = extractedEntities.locations[0];
      responseContent = `To reach the ${capitalize(location)}, take the metro to ${getRandomMetroStation()} station. It's about a ${getRandomWalkTime()} minute walk from there. Would you like me to show you the route?`;
      relatedPOIs = [getPOIInfo(location).id];
    } else {
      responseContent = `I can help you with directions! Which place are you trying to reach?`;
    }
  }
  else if (input.includes('weather') || input.includes('temperature') || input.includes('rain')) {
    responseContent = `The current weather in Athens is ${getRandomWeather()}. For today, the forecast shows ${getRandomForecast()}. Would you like me to recommend activities suitable for this weather?`;
  }
  else if (input.includes('food') || input.includes('eat') || input.includes('restaurant') || input.includes('cafe')) {
    responseContent = `If you're looking for food, I can recommend several options:\n\n1. Traditional Taverna in Plaka - authentic Greek dishes in a charming setting\n2. Modern Fusion Restaurant near Syntagma - creative takes on Mediterranean cuisine\n3. Street Food near Monastiraki - quick and delicious local specialties\n\nDo any of these interest you? I can provide more details or directions.`;
  }
  else if (input.includes('history') || input.includes('tell me about')) {
    if (extractedEntities.locations.length > 0) {
      const location = extractedEntities.locations[0];
      responseContent = getHistoryInfo(location);
      relatedPOIs = [getPOIInfo(location).id];
    } else {
      responseContent = `Athens has a rich history spanning over 3,400 years, making it one of the oldest cities in the world. The city is dominated by the Acropolis, a hilltop citadel topped with ancient buildings like the Parthenon temple. Athens was the heart of Ancient Greece, a powerful civilization and empire that established democracy, Western philosophy, literature, and drama. Would you like to know more about a specific historical period or monument?`;
    }
  }
  else {
    // Default response if no patterns match
    responseContent = `I'm here to help with your Athens travel experience! You can ask me about specific attractions, tour recommendations, directions, or local tips. What would you like to explore?`;
  }
  
  return {
    content: responseContent,
    relatedPOIs,
    relatedTours,
    updatedContext,
  };
};

// Helper functions
const getRandomCrowdLevel = () => {
  const levels = ['Low (2/10)', 'Moderate (5/10)', 'High (8/10)'];
  return levels[Math.floor(Math.random() * levels.length)];
};

const getRecommendedTime = (poi) => {
  if (poi === 'acropolis') {
    return 'best before 10am or after 4pm';
  } else if (poi === 'agora') {
    return 'generally uncrowded in the afternoon';
  } else {
    return 'usually fine any time';
  }
};

const getRandomMetroStation = () => {
  const stations = ['Acropolis', 'Syntagma', 'Monastiraki', 'Thissio'];
  return stations[Math.floor(Math.random() * stations.length)];
};

const getRandomWalkTime = () => {
  return Math.floor(Math.random() * 10) + 5; // 5-15 minutes
};

const getRandomWeather = () => {
  const conditions = [
    'sunny and warm at 28°C',
    'partly cloudy at 25°C',
    'clear skies at 27°C',
    'a bit windy at 24°C'
  ];
  return conditions[Math.floor(Math.random() * conditions.length)];
};

const getRandomForecast = () => {
  const forecasts = [
    'continued sunshine throughout the day',
    'some clouds in the afternoon but no rain expected',
    'temperatures cooling slightly in the evening',
    'perfect conditions for outdoor exploration'
  ];
  return forecasts[Math.floor(Math.random() * forecasts.length)];
};

const getRecommendationByTime = (timeframe) => {
  if (timeframe === 'morning') {
    return 'visiting the Acropolis before the crowds and heat build up';
  } else if (timeframe === 'afternoon') {
    return 'exploring the air-conditioned National Archaeological Museum';
  } else {
    return 'taking a stroll through the illuminated Plaka district and enjoying dinner at a rooftop restaurant with Acropolis views';
  }
};

const getRecommendationByInterest = (interest) => {
  const recommendations = {
    'history': 'the Ancient Agora, where you can walk in the footsteps of Socrates and Plato',
    'architecture': 'the Parthenon, a masterpiece of Doric architecture',
    'food': 'the Central Market and surrounding tavernas for authentic Greek cuisine',
    'art': 'the Benaki Museum, featuring Greek art from prehistoric to modern times',
    'shopping': 'Ermou Street and Monastiraki Flea Market for everything from boutiques to antiques',
    'culture': 'the Stavros Niarchos Foundation Cultural Center, a modern architectural landmark',
    'local': 'the neighborhood of Exarchia, known for its vibrant street art and alternative scene',
    'ancient': 'the Temple of Olympian Zeus, one of the largest temples of the ancient world',
    'modern': 'the National Museum of Contemporary Art, showcasing cutting-edge Greek artists',
    'photography': 'Lycabettus Hill, offering panoramic views of the city perfect for photography'
  };
  
  return recommendations[interest] || 'the Athens Walking Tour, which gives you a great overview of the city';
};

const getPOIInfo = (location) => {
  // Simplified for MVP - would be database-driven in production
  const poiDatabase = {
    'acropolis': {
      id: 'acropolis001',
      name: 'Acropolis',
      description: 'The Acropolis of Athens is an ancient citadel located on a rocky outcrop above the city of Athens. It contains the remains of several ancient buildings of great architectural and historical significance, the most famous being the Parthenon.',
      bestTime: 'Early morning or late afternoon',
    },
    'parthenon': {
      id: 'parthenon001',
      name: 'Parthenon',
      description: 'The Parthenon is a former temple on the Athenian Acropolis, dedicated to the goddess Athena, whom the people of Athens considered their patron deity. Construction began in 447 BC and was completed in 438 BC.',
      bestTime: 'Early morning for the best light',
    },
    'agora': {
      id: 'agora001',
      name: 'Ancient Agora',
      description: 'The Ancient Agora of Athens was the heart of ancient Athens, serving as the commercial, political, and social center of the city. It features the well-preserved Temple of Hephaestus and the reconstructed Stoa of Attalos.',
      bestTime: 'Mid-morning or late afternoon',
    },
    'plaka': {
      id: 'plaka001',
      name: 'Plaka District',
      description: 'Plaka is the oldest neighborhood of Athens, built on the northeastern slopes of the Acropolis. With its narrow streets, neoclassical architecture, and abundance of shops and restaurants, it\'s a charming area to explore.',
      bestTime: 'Evening for dinner and nightlife',
    },
    'temple': {
      id: 'zeus001',
      name: 'Temple of Olympian Zeus',
      description: 'The Temple of Olympian Zeus is a colossal ruined temple in the center of Athens dedicated to Zeus, king of the Olympian gods. Construction began in the 6th century BC but wasn\'t completed until the 2nd century AD under Roman Emperor Hadrian.',
      bestTime: 'Late afternoon for golden hour photography',
    },
    'museum': {
      id: 'museum001',
      name: 'Acropolis Museum',
      description: 'The Acropolis Museum is an archaeological museum focused on the findings of the archaeological site of the Acropolis of Athens. The museum was built to house every artifact found on the Acropolis and its slopes.',
      bestTime: 'Weekday mornings are least crowded',
    },
    'monastiraki': {
      id: 'monastiraki001',
      name: 'Monastiraki Square',
      description: 'Monastiraki is a flea market neighborhood in the old town of Athens, and is one of the principal shopping districts in Athens. The area is home to clothing boutiques, souvenir shops, and specialty stores.',
      bestTime: 'Sunday morning for the full flea market experience',
    },
    'syntagma': {
      id: 'syntagma001',
      name: 'Syntagma Square',
      description: 'Syntagma Square is the central square of Athens. The square is named after the Constitution that Otto, the first King of Greece, was obliged to grant after a popular and military uprising in 1843. It\'s home to the Greek Parliament building.',
      bestTime: 'On the hour to watch the changing of the guard ceremony',
    },
  };
  
  // Find a match or return default
  for (const key in poiDatabase) {
    if (location.includes(key)) {
      return poiDatabase[key];
    }
  }
  
  return {
    id: 'athens001',
    name: 'Athens',
    description: 'Athens is the capital and largest city of Greece. With a history spanning over 3,400 years, it\'s widely referred to as the cradle of Western civilization and the birthplace of democracy.',
    bestTime: 'Spring and fall offer the best weather',
  };
};

const getHistoryInfo = (location) => {
  // Simplified for MVP - would be database-driven in production
  const historyDatabase = {
    'acropolis': 'The Acropolis has been inhabited since the 4th millennium BC. In the 5th century BC, under the leadership of Pericles, Athens embarked on an ambitious building program that included the Parthenon, Propylaea, Erechtheion, and temple of Athena Nike. These monuments were designed by the architects Ictinus and Callicrates, while the sculptor Phidias supervised the entire project. The Acropolis suffered damage during a Venetian siege in 1687 when a cannonball hit the Parthenon, which was being used as a gunpowder magazine by the Ottoman Turks.',
    'parthenon': 'The Parthenon was built between 447-432 BC as a temple dedicated to the goddess Athena Parthenos. It replaced an older temple that was destroyed by the Persians in 480 BC. The temple contained a massive gold and ivory statue of Athena created by the sculptor Phidias. Over the centuries, the Parthenon served as a Byzantine church, a Catholic church, and an Ottoman mosque. In the early 19th century, Lord Elgin removed many of the marble sculptures, now known as the Elgin Marbles, which are displayed in the British Museum.',
    'agora': 'The Ancient Agora was the heart of public life in Athens for about 5,000 years. It served as a marketplace and a center for Athenian democracy where citizens gathered to discuss politics, philosophy, and daily affairs. Socrates engaged in philosophical debates here, and St. Paul preached to the Athenians at the Agora in 49 AD. The site contains the well-preserved Temple of Hephaestus, built around 450 BC, and the Stoa of Attalos, a reconstructed ancient shopping center that now houses the Museum of the Ancient Agora.',
    'plaka': 'Plaka is built on top of the residential areas of the ancient town of Athens. It has been continuously inhabited for thousands of years, making it one of the oldest neighborhoods in Europe. During the Ottoman rule of Greece, Plaka was the Turkish quarter of Athens. After Greek independence in the 19th century, the area became home to many neoclassical buildings. Despite some damage during World War II, Plaka has maintained its traditional character and is now protected by heritage laws.'
  };
  
  // Find a match or return default
  for (const key in historyDatabase) {
    if (location.includes(key)) {
      return historyDatabase[key];
    }
  }
  
  return 'Athens has a history spanning over 3,400 years, making it one of the world\'s oldest cities. Named after the goddess Athena, it became the leading city of Ancient Greece in the first millennium BC and produced many important cultural and intellectual achievements, including democracy, Western philosophy, literature, and the Olympic Games. After periods of Roman, Byzantine, and Ottoman rule, Athens became the capital of the independent Greek state in 1834. The city has experienced significant growth and transformation, particularly after World War II, evolving into a modern metropolis while preserving its ancient landmarks.';
};

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};