import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, TextInput, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import authStyles from '../styles/auth.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AUTH_SUCCESS } from '../commonService/authMessages.service';
import { AUTH_FAILURE } from '../commonService/authMessages.service';
import usePasswordToggle from '../hooks/usePasswordToggle';

const LoginPage = () => {
  const passwordToggle = usePasswordToggle();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (attemptCount >= MAX_ATTEMPTS) {
      navigation.navigate('ForgetPassword');
    }
  }, [attemptCount]);

  const handleLogin = async () => {
    if(loading) return;
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://192.168.2.105:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('attemp count = ', attemptCount);

      if (res.ok) {
        // save token
        await AsyncStorage.setItem('token', data.token);
        console.log('login data: ', data);
        setShowSuccess(true);
        setAttemptCount(0);
        setTimeout(() => {
          setShowSuccess(false);
          navigation.replace('Main');
        }, 1000);
      } else {
        setShowErrors(true);
        setAttemptCount(prev => prev + 1);
        setTimeout(() => {
          setShowErrors(false);
        }, 4000);
      }
    } catch (error) {
      Alert.alert('Network error', 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };
  const isFormFilled = email && password;
  return (
    <SafeAreaView style={authStyles.container}>
      <View style={authStyles.form}>
        <Text style={authStyles.title}>Login to BeSocial</Text>

        <TextInput
          style={authStyles.input}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <View style={authStyles.passwordContainer}>
          <TextInput
            style={[authStyles.input, { flex: 1, borderWidth: 0 }]}
            placeholder="Password"
            secureTextEntry={passwordToggle.secure}
            autoCapitalize="none"
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
        {showErrors && (
          <View style={authStyles.successContainer}>
            <Text style={authStyles.error}>{AUTH_FAILURE.LOGIN}</Text>

            {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && (
              <Text style={authStyles.error}>
                {MAX_ATTEMPTS - attemptCount} attempts remaining
              </Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={authStyles.button}
          onPress={handleLogin}
          disabled={!isFormFilled || loading}
        >
          <Text style={authStyles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
        {showSuccess && (
          <View style={authStyles.successContainer}>
            <Text style={authStyles.successText}>{AUTH_SUCCESS.LOGIN}</Text>
          </View>
        )}

        <View style={authStyles.loginContainer}>
          <Text style={authStyles.loginText}>Not socialized yet?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={authStyles.loginLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
        <View style={authStyles.loginContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgetPassword')}
          >
            <Text style={authStyles.loginLink}>Forget password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginPage;
