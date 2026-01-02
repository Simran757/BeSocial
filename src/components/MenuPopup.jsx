import { Modal, Pressable, Text, View } from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import menuPopup from '../styles/menuPopup.style';
const MenuPopup = ({ visible, onClose, position, postId, onPostDelete }) => {
  const navigation = useNavigation();
  const deletePost = async postId => {
    const res = await fetch(
      `http://192.168.2.105:5000/api/post/deletePost/${postId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const text = await res.text();
    let data;   
    try {
      if (res.ok) {
        data = JSON.parse(text);
        console.log('Post deleted successfully');
        onPostDelete(postId);
        onClose();
      } else {
        console.log('Error deleting post:', data.message);
      }
    } catch (error) {
      console.log('Error parsing response:', error);
    }
    return data;
  };
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={menuPopup.overlay} onPress={onClose}>
        <View
          style={[
            menuPopup.menu,
            {
              top: position.y,
              left: position.x - 140,
            },
          ]}
        >
          <Pressable
            style={menuPopup.menuItem}
            onPress={() => {
              onClose();
              navigation.navigate('EditPostPage');
            }}
          >
            <Text>Edit Post</Text>
          </Pressable>

          <Pressable
            style={menuPopup.menuItem}
            onPress={() => {
              onClose();
              deletePost(postId);
            }}
          >
            <Text>Delete Post</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default MenuPopup;
