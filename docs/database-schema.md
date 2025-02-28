# Database Schema

## Collections

### Users
```
{
  id: string,
  name: string,
  email: string,
  preferences: {
    languages: string[],
    interests: string[],
    pace: "slow" | "moderate" | "fast",
    accessibility: boolean,
    maxDistance: number
  },
  savedTours: string[],
  savedPOIs: string[],
  history: {
    completedTours: [
      {
        tourId: string,
        date: timestamp,
        rating: number,
        feedback: string
      }
    ],
    visitedPOIs: [
      {
        poiId: string,
        date: timestamp
      }
    ]
  }
}
```

### Points of Interest (POIs)
```
{
  id: string,
  name: string,
  description: string,
  shortDescription: string,
  type: string[],  // ["historical", "cultural", "museum", etc.]
  coordinates: {
    latitude: number,
    longitude: number
  },
  address: string,
  images: string[],
  openingHours: {
    monday: { open: string, close: string },
    // ... other days
  },
  crowdData: {
    historicalAverages: {
      monday: { morning: number, afternoon: number, evening: number },
      // ... other days
    },
    realTimeData: {
      level: number,  // 1-10 scale
      lastUpdated: timestamp
    }
  },
  tags: string[],
  accessibility: {
    wheelchairAccess: boolean,
    hasElevator: boolean,
    audioGuide: boolean,
    brailleInfo: boolean
  },
  content: {
    fullDescription: string,
    history: string,
    facts: string[],
    stories: string[]
  },
  nearbyPOIs: string[]
}
```

### Tours
```
{
  id: string,
  name: string,
  description: string,
  duration: number,  // in minutes
  distance: number,  // in kilometers
  difficulty: "easy" | "moderate" | "challenging",
  pois: [
    {
      poiId: string,
      order: number,
      duration: number,  // suggested time in minutes
      navigationInfo: string
    }
  ],
  tags: string[],
  languages: string[],
  ratings: {
    average: number,
    count: number
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Conversations
```
{
  id: string,
  userId: string,
  messages: [
    {
      id: string,
      sender: "user" | "system",
      content: string,
      timestamp: timestamp,
      relatedPOIs: string[],
      relatedTours: string[]
    }
  ],
  context: {
    location: {
      latitude: number,
      longitude: number
    },
    activeTour: string,
    currentPOI: string
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```