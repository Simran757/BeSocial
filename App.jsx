import React from 'react';
import SignUpPage from './src/screens/SignUpPage';
import LoginPage from './src/screens/LoginPage';
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthLoading from './src/screens/AuthLoading';
import MainNavigator from './src/navigations/MainNavigator';
import SettingScreen from './src/screens/SettingScreen';
import CreatePost from './src/screens/CreatePost';
import ForgetPassword from './src/screens/ForgetPassword';
import EditProfilePage from './src/screens/EditProfilePage';
import About from './src/screens/About';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
  <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="AuthLoading" component={AuthLoading}/>
        <Stack.Screen name= "SignUp" component={SignUpPage} />
        <Stack.Screen name= "Login" component={LoginPage} />
        <Stack.Screen name= "Main" component={MainNavigator} />
        <Stack.Screen name= "Settings" component={SettingScreen} />
        <Stack.Screen name= "CreatePost" component={CreatePost} />
        <Stack.Screen name= "ForgetPassword" component={ForgetPassword} />
        <Stack.Screen name= "EditProfilePage" component={EditProfilePage} />
        <Stack.Screen name= "About" component={About} />  
        <Stack.Screen name= "EditPostPage" component={EditProfilePage} />
        <Stack.Screen name= "ProfileScreen" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </SafeAreaProvider>
    
 )};

export default App;

