import { TextInput, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import authStyles from '../styles/auth.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { validateSignup } from '../commonService/authValidation.service';
import { AUTH_SUCCESS } from '../commonService/authMessages.service';
import usePasswordToggle from '../hooks/usePasswordToggle';

const SignUpPage = () => {
  const passwordToggle = usePasswordToggle();
  const confirmPasswordToggle = usePasswordToggle();
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSignup = async () => {
    console.log('Signup button clicked');
    const validationErrors = validateSignup({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    try {
      const res = await fetch('http://192.168.2.103:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
        }),
      });

      console.log('Status:', res.status);

      const data = await res.json();
      console.log('Response:', data);

      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigation.replace('Login');
        }, 2000);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log('Signup error:', error);
      alert('Network error');
    }
  };

  const isFormFilled =
    firstName && lastName && email && password && confirmPassword;

  return (
    <SafeAreaView style={authStyles.container}>
      <View style={authStyles.form}>
        <Text style={authStyles.title}>Sign up to BeSocial</Text>

        <TextInput
          style={authStyles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        {errors.firstName && (
          <Text style={authStyles.error}>{errors.firstName}</Text>
        )}

        <TextInput
          style={authStyles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
        {errors.lastName && (
          <Text style={authStyles.error}>{errors.lastName}</Text>
        )}

        <TextInput
          style={authStyles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        {errors.email && <Text style={authStyles.error}>{errors.email}</Text>}
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
              size="20"
              color="grey"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={authStyles.error}>{errors.password}</Text>
        )}
        <View style={authStyles.passwordContainer}>
          <TextInput
            style={[authStyles.input, { flex: 1, borderWidth: 0 }]}
            placeholder="Confirm Password"
            secureTextEntry={confirmPasswordToggle.secure}
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={confirmPasswordToggle.toggle}>
            <FontAwesomeIcon
              icon={confirmPasswordToggle.secure ? faEyeSlash : faEye}
              size="20"
              color="grey"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={authStyles.error}>{errors.confirmPassword}</Text>
        )}

        <TouchableOpacity
          style={[authStyles.button]}
          disabled={!isFormFilled}
          onPress={handleSignup}
        >
          <Text style={authStyles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        {showSuccess && (
          <View style={authStyles.successContainer}>
            <Text style={authStyles.successText}>{AUTH_SUCCESS.SIGNUP}</Text>
          </View>
        )}

        <View style={authStyles.loginContainer}>
          <Text style={authStyles.loginText}>Already on BeSocial?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={authStyles.loginLink}>Login now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignUpPage;
