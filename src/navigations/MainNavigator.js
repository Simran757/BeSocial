import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import HomeScreen from '../screens/HomeScreen';
import MessageScreen from '../screens/MessageScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faMagnifyingGlass,
  faMessage,
  faHouse,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: 'black',
        tabBarInactiveBackgroundColor: 'white',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: () => (
            <FontAwesomeIcon icon={faHouse} color="grey" size="20" />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessageScreen}
        options={{
          tabBarIcon: () => (
            <FontAwesomeIcon icon={faMessage} color="grey" size="20" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: () => (
            <FontAwesomeIcon icon={faUser} color="grey" size="20" />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: () => (
            <FontAwesomeIcon icon={faMagnifyingGlass} color="grey" size="20" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
