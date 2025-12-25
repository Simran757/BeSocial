import { Text, View, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import postCardStyle from '../styles/postCardStyle.style';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleUser,
  faPaperPlane,
  faComment,
  faHeart,
} from '@fortawesome/free-solid-svg-icons';

const PostCardOnUser = ({
  text,
  image,
  likeCount,
  shareCount,
  commentCount,
  userName,
}) => {
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
      </View>
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
