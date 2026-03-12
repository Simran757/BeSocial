import { ActivityIndicator, View } from 'react-native';
import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authLoading from '../styles/authLoading.style';

const AuthLoading = ({ navigation }) => {
  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('token');

      if (token) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    };

    checkLogin();
  }, [navigation]);

  return (
    <View style={authLoading.container}>
      <ActivityIndicator size="large" />
    </View>
  );
};
export default AuthLoading;
