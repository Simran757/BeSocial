import { Text, View } from 'react-native'
import React from 'react';
import settingCardStyle from "../styles/messageCard.style";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';


const SettingCard = ({ setting, iconName }) => {
  return (
    <View style={settingCardStyle.container}>
      <FontAwesomeIcon icon={iconName} size="20"/>
      <Text style={settingCardStyle.mainText}>{setting}</Text>
    </View>
  );
};


export default SettingCard;

