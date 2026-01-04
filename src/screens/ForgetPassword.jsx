import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import forgetPassword from '../styles/forgetPassword.style';
import authStyles from '../styles/auth.styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleArrowLeft,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import usePasswordToggle from '../hooks/usePasswordToggle';
import { validateSignup } from '../commonService/authValidation.service';
import api from '../api/axios';
const ForgetPassword = () => {
  const passwordToggle = usePasswordToggle();
  const confirmPasswordToggle = usePasswordToggle();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const validationErrors = validateSignup({
      email,
      password: newPassword,
      confirmPassword,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    try {
      const res = await api.post(
        '/api/auth/forget-password',
        {
          email,
          newPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('api hit');
      console.log('data:', res.data);
      if (res.status === 200 || res.status === 201 ) {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log('Signup error:', error);
      alert('Network error');
    }
  };

  return (
    <View style={forgetPassword.container}>
      {/* title container */}
      <View style={forgetPassword.titleContainer}>
        <View style={forgetPassword.iconContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <FontAwesomeIcon icon={faCircleArrowLeft} size={20} />
          </TouchableOpacity>
        </View>
        <Text style={forgetPassword.title}>Forget Password</Text>
      </View>
      {/* forget password form container */}
      <View style={forgetPassword.formConatiner}>
        {/* input container */}
        <View style={forgetPassword.inputContainer}>
          <TextInput
            style={forgetPassword.inputBox}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        {errors.email && <Text style={authStyles.error}>{errors.email}</Text>}
        <View style={forgetPassword.inputContainer}>
          <TextInput
            style={[forgetPassword.inputBox, { flex: 1, borderWidth: 0 }]}
            placeholder="Password"
            secureTextEntry={passwordToggle.secure}
            autoCapitalize="none"
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={forgetPassword.iconContainer}
            onPress={passwordToggle.toggle}
          >
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
        <View style={forgetPassword.inputContainer}>
          <TextInput
            style={[forgetPassword.inputBox, { flex: 1, borderWidth: 0 }]}
            placeholder="Confirm Password"
            secureTextEntry={confirmPasswordToggle.secure}
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={forgetPassword.iconContainer}
            onPress={confirmPasswordToggle.toggle}
          >
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
        {/* button container */}
        <View style={authStyles.button}>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={authStyles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ForgetPassword;
