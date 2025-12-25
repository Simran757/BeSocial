import { FlatList, Text, View } from 'react-native'
import React from 'react';
import messageScreen from "../styles/messageScreen.style";
import Header from '../components/Header'
import MessageCard from "../components/MessageCard";
import home from "../styles/home.style";
const messageData = [
  { id: 1, userName: "Simran Kashyap", messageText: "How are you?" },
  { id: 2, userName: "Shivam Bharti", messageText: "Hey! Long time no see." },
  { id: 3, userName: "Aditi Sharma", messageText: "Did you check the new update?" },
  { id: 4, userName: "Rahul Verma", messageText: "Let's catch up this weekend." },
  { id: 5, userName: "Neha Singh", messageText: "I just finished my task." },
  { id: 6, userName: "Aman Gupta", messageText: "Can you review my code?" },
  { id: 7, userName: "Pooja Mehta", messageText: "Meeting is at 3 PM today." },
  { id: 8, userName: "Rohit Kumar", messageText: "Server is running fine now." },
  { id: 9, userName: "Kriti Malhotra", messageText: "Loved the new UI design!" },
  { id: 10, userName: "Vikas Yadav", messageText: "Bug fixed and pushed to repo." },
  { id: 11, userName: "Sneha Patel", messageText: "Can we talk later?" },
  { id: 12, userName: "Karan Singh", messageText: "Learning React Native is fun!" },
  { id: 13, userName: "Anjali Roy", messageText: "Uploaded the video today 🎥" },
  { id: 14, userName: "Mohit Jain", messageText: "Startup idea sounds promising." },
  { id: 15, userName: "Riya Kapoor", messageText: "Writing a new blog post." },
  { id: 16, userName: "Arjun Malhotra", messageText: "Let me know when you're free." },
  { id: 17, userName: "Nisha Arora", messageText: "Good morning ☀️" },
  { id: 18, userName: "Saurabh Mishra", messageText: "App performance improved a lot." },
  { id: 19, userName: "Priya Nair", messageText: "Can you help me with this?" },
  { id: 20, userName: "Rohan Mehta", messageText: "See you tomorrow!" },
];

const MessageScreen = () => {
  const renderMessage = ({item}) => (
    <MessageCard
    userName={item.userName}
    messageText = {item.messageText}/>
  );
  return (
    <View style = {home.container}>
      <Header />
      <Text style = {home.mainText}>Inbox</Text>
      <View style={messageScreen.lineContainer}>
        <View style={messageScreen.line}/>
      </View>
      <FlatList 
      data={messageData}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id.toString()}
      showVerticalScrollIndicator={false}/>
    </View>
  )
};

export default MessageScreen;

