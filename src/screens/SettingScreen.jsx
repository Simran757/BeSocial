import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import settingStyle from '../styles/settingStyle.style';
import SettingCard from '../components/SettingCard';
import {
  faCircleInfo,
  faKey,
  faCircleHalfStroke,
  faBell,
  faUserPen,
  faArrowCircleLeft,
} from '@fortawesome/free-solid-svg-icons';
import authStyles from '../styles/auth.styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

const settings = [
  { id: 1, title: 'Edit Profile', iconNames: faUserPen },
  { id: 2, title: 'Notifications', iconNames: faBell },
  { id: 3, title: 'Dark Mode', iconNames: faCircleHalfStroke },
  { id: 4, title: 'Change Password', iconNames: faKey },
  { id: 5, title: 'About App', iconNames: faCircleInfo },
];
const SettingScreen = () => {
  const navigation = useNavigation();
  const [showLogout, setShowLogout] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const renderSetting = ({ item }) => (
    <SettingCard setting={item.title} iconName={item.iconNames} />
  );
  const confirmLogout = () => {
    setIsVisible(true);
  };

  const handleLogout = async () => {
    setIsVisible(false);
    console.log('logout pressed');
    try {
      await AsyncStorage.removeItem('token');
      setShowLogout(true);
      setTimeout(() => {
        setShowLogout(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 3000);
    } catch (error) {
      console.log('Error in logout: ', error.message);
    }
  };

  return (
    <View style={settingStyle.container}>
      <View style = {settingStyle.titleContainer}>
        <TouchableOpacity 
        style = {settingStyle.iconContainer}
        onPress={() => navigation.goBack()}>
          <FontAwesomeIcon icon={faArrowCircleLeft} size = "25"/>
        </TouchableOpacity>
        <Text style = {settingStyle.title}>Settings</Text>
      </View>
      <FlatList
        data={settings}
        renderItem={renderSetting}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        visible={isVisible}
        transparent={true}
        onRequestClose={() => {
          setIsVisible(false);
        }}
      >
        <View style={settingStyle.boxContainer}>
          <View style={settingStyle.popUpBox}>
            <Text style={settingStyle.popUpText}>You will be Logged out!</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={settingStyle.popUpbutton}>Ok !</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={settingStyle.button} onPress={confirmLogout}>
        <Text style={settingStyle.buttonText}>Logout</Text>
      </TouchableOpacity>
      {showLogout && (
        <View style={authStyles.successContainer}>
          <Text style={authStyles.successText}>Logged Out Successfully!</Text>
        </View>
      )}
    </View>
  );
};

export default SettingScreen;
