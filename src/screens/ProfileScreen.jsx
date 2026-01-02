import {
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import messageScreen from '../styles/messageScreen.style';
import home from '../styles/home.style';
import profileScreenStyle from '../styles/profileScreenStyle.style';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleUser, faPlus } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import PostCardOnUser from '../components/PostCardOnUser';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const handlePostDelete = postId => {
    setMyPosts(prevPost => prevPost.filter(post => post._id !== postId));
  };
  // Load user name from token
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (token) {
          const decoded = jwtDecode(token);
          const fullName = `${decoded.firstName} ${decoded.lastName}`;
          setUserName(fullName);
        }
      } catch (error) {
        console.error('Failed to load user data', error);
      }
    };

    loadUserData();
    fetchMyPosts();
  }, []);

  // Fetch logged-in user's posts
  const fetchMyPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(
        'http://192.168.2.105:5000/api/post/getPostByUser',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();
      setMyPosts(data);
    } catch (error) {
      console.log('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }) => (
    <PostCardOnUser
      postId={item._id}
      text={item.text}
      image={item.image}
      onPostDelete={handlePostDelete}
      likeCount={item.activity?.likeCount}
      commentCount={item.activity?.commentCount}
      shareCount={item.activity?.shareCount}
      userName={`${item.user?.firstName} ${item.user?.lastName}`}
    />
  );

  return (
    <View style={home.container}>
      {/* Profile Header */}
      <Header />

      <Text style={home.mainText}>User Profile</Text>

      <View style={messageScreen.lineContainer}>
        <View style={messageScreen.line} />
      </View>

      <View style={profileScreenStyle.mainContainer}>
        <View style={profileScreenStyle.profileContainer}>
          <View style={profileScreenStyle.profileIcon}>
            <FontAwesomeIcon icon={faCircleUser} size="60" />
          </View>

          <View style={profileScreenStyle.profileText}>
            <Text style={profileScreenStyle.userNameContainer}>{userName}</Text>
            <Text style={profileScreenStyle.description}>Bio</Text>
            <Text style={profileScreenStyle.description}>
              Total Posts: {myPosts.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <FontAwesomeIcon icon={faPlus} size="25" />
        </TouchableOpacity>
      </View>
      {/* User Posts */}
      <View style={profileScreenStyle.postsContainer}>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={myPosts}
            renderItem={renderPost}
            keyExtractor={item => item._id.toString()}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

export default ProfileScreen;
