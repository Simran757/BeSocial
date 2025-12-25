import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import messageCardStyle from "../styles/messageCard.style";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleUser } from '@fortawesome/free-solid-svg-icons';

const MessageCard = ({userName,messageText}) => {
  return (
    // Outer card
   
    <View style={messageCardStyle.container}>
      
        <View style ={messageCardStyle.iconArea}>
            <FontAwesomeIcon icon={faCircleUser} size="40" />
        </View>
        <View style={messageCardStyle.textArea}>
          <Text style={messageCardStyle.userName}>{userName}</Text>
          <Text style={messageCardStyle.mainText}>{messageText}</Text>
        </View>

    </View>
  )
};

export default MessageCard;

