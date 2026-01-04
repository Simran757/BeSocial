import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import createPost from '../styles/createPost.style';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowCircleLeft, faImage } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../api/axios';
const CreatePost = () => {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };
  const handleSubmit = async () => {
    if (!text.trim()) {
      console.log('Text is required');
      return;
    }
    if (loading) return;
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('text', text);
    if (image) {
      formData.append('image', {
        uri: image.uri,
        type: image.type,
        name: image.fileName,
      });
    }
    try {
      console.log('post button clicked');
      console.log('TOKEN:', token);
      console.log('FORM DATA:', formData);
      const res = await api.post('/api/post/createPost', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('create post api hit');
      console.log('Response data:', res.data);
      if (res.status === 201) {
        setText('');
        setImage(null);
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error in creating post: ', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={createPost.postContainer}>
      <View style={createPost.titleContainer}>
        <TouchableOpacity
          style={createPost.iconContainer}
          onPress={() => navigation.goBack()}
        >
          <FontAwesomeIcon icon={faArrowCircleLeft} size={25} />
        </TouchableOpacity>
        <Text style={createPost.title}>Post your Thoughts</Text>
      </View>
      <View style={createPost.mainContainer}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput
            placeholder="Enter your thoughts"
            multiline={true}
            value={text}
            onChangeText={setText}
            style={createPost.textContainer}
            maxLength={200}
          />
        </ScrollView>
        {image && (
          <Image
            source={{ uri: image.uri }}
            style={{ width: '100%', height: 200, marginTop: 10 }}
          />
        )}
        <View style={createPost.imageContainer}>
          <TouchableOpacity onPress={openGallery}>
            <FontAwesomeIcon icon={faImage} size={20} />
          </TouchableOpacity>
        </View>
        <View style={createPost.buttonContainer}>
          <TouchableOpacity onPress={handleSubmit}>
            <View style={createPost.button}>
              <Text style={createPost.buttonText}>Post</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CreatePost;
