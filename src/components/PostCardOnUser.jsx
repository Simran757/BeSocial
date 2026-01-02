import {
  Text,
  View,
  Image,
  TouchableOpacity,
  findNodeHandle,
  UIManager,
} from 'react-native';
import React, { useState, useRef } from 'react';
import MenuPopup from '../components/MenuPopup';
import postCardStyle from '../styles/postCardStyle.style';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleUser,
  faPaperPlane,
  faComment,
  faHeart,
  faEllipsisV,
} from '@fortawesome/free-solid-svg-icons';

const PostCardOnUser = ({
  postId,
  text,
  image,
  likeCount,
  shareCount,
  commentCount,
  onPostDelete,
  userName,
}) => {
  const dotIconRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => {
    const handle = findNodeHandle(dotIconRef.current);

    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      // You can use pageX and pageY to position your menu if needed
      setMenuPosition({ x: pageX, y: pageY + height });
      setMenuVisible(true);
    });
  };
  return (
    // Outer card
    <View style={postCardStyle.container}>
      {/* User profile section */}
      <View style={postCardStyle.innerContainer}>
        {/* user profile icon */}
        <FontAwesomeIcon icon={faCircleUser} size="40" />
        <View style={postCardStyle.userContainer}>
          <Text style={postCardStyle.userName}>
            {userName || 'Unknown user'}
          </Text>
          <Text style={postCardStyle.description}>bio</Text>
        </View>
        <TouchableOpacity
          style={postCardStyle.dotIcon}
          ref={dotIconRef}
          onPress={openMenu}
        >
          <FontAwesomeIcon icon={faEllipsisV} size={23} />
        </TouchableOpacity>
      </View>
      <MenuPopup
        visible={menuVisible}
        position={menuPosition}
        onPostDelete={onPostDelete}
        onClose={() => setMenuVisible(false)}
        postId={postId}
      />
      {/* Post content section */}
      <View>
        {/* Post Image */}
        {image && (
          <View style={postCardStyle.imageContainer}>
            <Image source={image} style={postCardStyle.postImage} />
          </View>
        )}

        {/* Post text */}
        <Text style={postCardStyle.mainText}>{text}</Text>
      </View>
      <View style={postCardStyle.buttonContainer}>
        {/* Like Button */}
        <TouchableOpacity>
          <View style={postCardStyle.buttonStyle}>
            <FontAwesomeIcon icon={faHeart} size="20" />
            <Text style={postCardStyle.textStyle}>{likeCount}</Text>
          </View>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity>
          <View style={postCardStyle.buttonStyle}>
            <FontAwesomeIcon icon={faPaperPlane} size="20" />
            <Text style={postCardStyle.textStyle}>{shareCount}</Text>
          </View>
        </TouchableOpacity>
        {/* Comment Button */}
        <TouchableOpacity>
          <View style={postCardStyle.buttonStyle}>
            <FontAwesomeIcon icon={faComment} size="20" />
            <Text style={postCardStyle.textStyle}>{commentCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PostCardOnUser;
