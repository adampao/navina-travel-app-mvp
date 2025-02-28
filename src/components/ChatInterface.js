import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// This would be connected to your actual API service
const mockSendMessage = async (message, context) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock response based on user message keywords
  if (message.toLowerCase().includes('acropolis')) {
    return {
      content: 'The Acropolis of Athens is an ancient citadel located on a rocky outcrop above the city of Athens. It contains the remains of several ancient buildings of great architectural and historical significance, the most famous being the Parthenon.',
      relatedPOIs: ['acropolis001'],
      relatedTours: ['athens_classics_001'],
    };
  } else if (message.toLowerCase().includes('tour') || message.toLowerCase().includes('guide')) {
    return {
      content: 'I can help you find a perfect tour based on your interests. Would you prefer a historical tour, a cultural experience, or perhaps something focused on local cuisine?',
      relatedTours: ['athens_classics_001', 'athens_food_001', 'athens_hidden_001'],
    };
  } else if (message.toLowerCase().includes('crowd') || message.toLowerCase().includes('busy')) {
    return {
      content: 'Currently, the Acropolis is moderately crowded (6/10). The Ancient Agora is less crowded (3/10). Would you like me to suggest a less crowded route?',
      relatedPOIs: ['acropolis001', 'agora001'],
    };
  } else {
    return {
      content: 'I'm here to help with your travel plans! You can ask me about specific sites, tour recommendations, or current crowd levels at popular attractions.',
    };
  }
};

const ChatInterface = ({ userLocation, currentPOI, activeTour }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'system',
      content: 'Hello! I'm Navina, your personal travel guide. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (inputText.trim() === '') return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Pass current context for relevant responses
      const context = {
        location: userLocation,
        currentPOI,
        activeTour,
      };
      
      const response = await mockSendMessage(inputText, context);
      
      const systemMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: response.content,
        timestamp: new Date(),
        relatedPOIs: response.relatedPOIs,
        relatedTours: response.relatedTours,
      };
      
      setMessages(prevMessages => [...prevMessages, systemMessage]);
    } catch (error) {
      // Handle error
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.systemBubble,
          item.isError && styles.errorBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
        
        {/* Display related POIs or tours if available */}
        {item.relatedPOIs && item.relatedPOIs.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedTitle}>Related Places:</Text>
            {item.relatedPOIs.map(poi => (
              <TouchableOpacity key={poi} style={styles.relatedItem}>
                <Text style={styles.relatedText}>View details</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {item.relatedTours && item.relatedTours.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedTitle}>Suggested Tours:</Text>
            {item.relatedTours.map(tour => (
              <TouchableOpacity key={tour} style={styles.relatedItem}>
                <Text style={styles.relatedText}>View tour</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything about your trip..."
          placeholderTextColor="#999"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, inputText.trim() === '' && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={inputText.trim() === '' || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#3b82f6', // Tailwind blue-500
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorBubble: {
    backgroundColor: '#fee2e2', // Tailwind red-100
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  relatedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  relatedItem: {
    backgroundColor: '#f0f9ff', // Tailwind blue-50
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  relatedText: {
    color: '#3b82f6', // Tailwind blue-500
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6', // Tailwind blue-500
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd', // Tailwind blue-300
  },
});

export default ChatInterface;