import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, TextInput, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import authStyles from '../styles/auth.styles';
import usePasswordToggle from '../hooks/usePasswordToggle';
import api from '../api/axios';
import { SamparkChat } from '../lib/sampark-chat/sampark-chat.esm.js';

const APP_ID = 'vEGPyfeTjxTer69G2LvXwkJNjksUmwG0';
const SECRET_KEY = 'erGQjMJoihMiDxTofogn0U9ydSfgFxtSzPceawg4Sv2oHuSAL8AdVcp';
const LOGIN_LISTENER_ID = 'APP_LOGIN_LISTENER';

// 🔒 prevent double init
let samparkInitialized = false;

const LoginPage = () => {
  const navigation = useNavigation();
  const passwordToggle = usePasswordToggle();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /* ---------------- SDK INIT ---------------- */
  useEffect(() => {
    const initSampark = async () => {
      try {
        if (samparkInitialized) return;

        console.log('🚀 Initializing Sampark Chat SDK...');
        await SamparkChat.init(APP_ID, SECRET_KEY);

        samparkInitialized = true;
        console.log('✅ Sampark SDK initialized');
      } catch (error) {
        console.error('❌ Sampark init error:', error?.message);
      }
    };

    initSampark();
  }, []);

  /* ---------------- LOGIN LISTENER ---------------- */
  useEffect(() => {
    SamparkChat.addLoginListener(LOGIN_LISTENER_ID, {
      loginSuccess: user => {
        console.log('🎉 Sampark login success:', user);
      },
      loginFailure: error => {
        console.error('❌ Sampark login failure:', error);
      },
      logoutSuccess: () => {
        console.log('👋 Sampark logout success');
      },
      logoutFailure: error => {
        console.error('❌ Sampark logout failure:', error);
      },
    });

    return () => {
      SamparkChat.removeLoginListener(LOGIN_LISTENER_ID);
    };
  }, []);

  /* ---------------- CHECK EXISTING SESSION ---------------- */
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔄 Checking existing Sampark session...');
        const user = await SamparkChat.getLoggedinUser();

        if (user) {
          console.log('✅ Existing Sampark session found:', user);
          navigation.replace('Main');
        } else {
          console.log('ℹ️ No Sampark session found');
        }
      } catch (err) {
        console.log('ℹ️ No active session');
      }
    };

    checkSession();
  },[navigation]);

  /* ---------------- HANDLE LOGIN ---------------- */
  const handleLogin = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      console.log('🔐 Backend login started');

      const res = await api.post('/api/auth/login', {
        username,
        email,
        password,
      });

      console.log('✅ Backend login success:', res.data);

      // 1️⃣ Save token
      await AsyncStorage.setItem('token', res.data.token);

      const samparkUserId = res.data.user?.userid || res.data.user?.id;

      if (!samparkUserId) {
        throw new Error('Missing Sampark user id');
      }

      // 2️⃣ Login to Sampark
      console.log('🔐 Logging into Sampark:', samparkUserId);
      await SamparkChat.login(samparkUserId);

      console.log('✅ Sampark login success');

      navigation.replace('Main');
    } catch (error) {
      console.error('❌ Login failed:', error?.message);
      Alert.alert('Login Failed', error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isFormFilled = username && email && password;

  return (
    <SafeAreaView style={authStyles.container}>
      <View style={authStyles.form}>
        <Text style={authStyles.title}>Login</Text>

        <TextInput
          style={authStyles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={authStyles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />

        <View style={authStyles.passwordContainer}>
          <TextInput
            style={[authStyles.input, authStyles.passwordInput]}
            placeholder="Password"
            secureTextEntry={passwordToggle.secure}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={passwordToggle.toggle}>
            <FontAwesomeIcon
              icon={passwordToggle.secure ? faEyeSlash : faEye}
              size={20}
              color="grey"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={authStyles.button}
          onPress={handleLogin}
          disabled={!isFormFilled || loading}
        >
          <Text style={authStyles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginPage;