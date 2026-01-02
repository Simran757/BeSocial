import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import settingCardStyle from '../styles/messageCard.style';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';

const SettingCard = ({ setting, iconName }) => {
  const navigation = useNavigation();
  const handleButtonPress = () => {
    if (setting === 'Edit Profile') {
      navigation.navigate('EditProfilePage');
    }
    if(setting === 'Change Password'){
      navigation.navigate('ForgetPassword');
    }
    if(setting === 'About App'){
      navigation.navigate('About');
    }
  }
  return (
    <View>
      <TouchableOpacity style={settingCardStyle.container} onPress={handleButtonPress}>
        <FontAwesomeIcon icon={iconName} size="20" />
        <Text style={settingCardStyle.mainText}>{setting}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SettingCard;
