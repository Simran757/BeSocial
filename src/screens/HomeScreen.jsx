import {
  Text,
  View,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import home from '../styles/home.style';
import PostCard from '../components/PostCard';
import messageScreen from '../styles/messageScreen.style';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import api from '../api/axios';
const HomeScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const tabBarHeight = useBottomTabBarHeight();
  // will run when component mounts  for once
  useEffect(() => {
    fetchAllPost();
  }, []);
  const fetchAllPost = async () => {
    try {
      const res = await api.get('/api/post/getAllPost', {
        headers: { 'Content-Type': 'application/json' },
      });
 
      console.log('response from api ', res.data);
      setPosts(res.data.posts || []);
    } catch (error) {
      console.log('Error in showing posts: ', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }) => (
    <PostCard
      text={item.text}
      image={item.image}
      likeCount={item.activity?.likeCount}
      commentCount={item.activity?.commentCount}
      shareCount={item.activity?.shareCount}
      userName={
        item.user
          ? `${item.user.firstName} ${item.user.lastName}`
          : 'Unknown User'
      }
    />
  );
  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <View style={home.container}>
      <Header />
      <Text style={home.mainText}>Welcome to BeSocial!</Text>
      <View style={messageScreen.lineContainer}>
        <View style={messageScreen.line} />
      </View>
      <View style={home.postContainer}>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item._id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight }}
        />
      </View>
    </View>
  );
};

export default HomeScreen;
