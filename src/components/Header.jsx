import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react'
import headerStyle from '../styles/headerStyle.styles';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
const navigation = useNavigation();

  return (
    <View style = {headerStyle.header}>
      <Text style = {headerStyle.headerText}>BeSocial</Text>

      <TouchableOpacity  onPress={() =>{navigation.navigate("Settings")}}>
        <View>
          <FontAwesomeIcon icon={faGear} size={24} color="black" />
        </View>
      </TouchableOpacity>
    </View>
  )
};

export default Header;

