import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SamparkChat } from '../lib/sampark-chat/sampark-chat.esm.js';
import api from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import styles from '../styles/messageScreen.style';
import Header from '../components/Header.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleUser } from '@fortawesome/free-solid-svg-icons';

const MessageScreen = () => {
  const navigation = useNavigation();

  const [chatType, setChatType] = useState('peer');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Get current user ID from token
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode(token);
          setCurrentUserId(decoded.userid || decoded.id || decoded._id);
        }
      } catch (e) {
        console.log('Error decoding token:', e);
      }
    };
    loadCurrentUser();
  }, []);

  // Online/Offline presence listener
  useEffect(() => {
    const listenerId = 'message-screen-presence-listener';

    const fetchOnlineUsers = () => {
      try {
        const onlineUsersList = SamparkChat.getOnlineUsers();
        setOnlineUsers(new Set(onlineUsersList));
      } catch (err) {
        console.log('Error fetching online users:', err);
      }
    };

    SamparkChat.addUserListener(listenerId, {
      onUserOnline: onlineUser => {
        const userId = onlineUser.getUid ? onlineUser.getUid() : onlineUser.uid;
        if (userId) {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(userId);
            return newSet;
          });
        }
      },
      onUserOffline: offlineUser => {
        const userId = offlineUser.getUid
          ? offlineUser.getUid()
          : offlineUser.uid;
        if (userId) {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      },
    });

    fetchOnlineUsers();

    return () => {
      SamparkChat.removeUserListener(listenerId);
    };
  }, []);

  // Fetch users and groups
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        if (chatType === 'peer') {
          console.log('Loading peer chats user lists...');

          // 1. Fetch users from SDK
          const participants =
            await SamparkChat.PeerChat.getapplictionuserlist();
          console.log('Peer chats user lists:', participants);

          // 2. Fetch app-registered users from backend
          const token = await AsyncStorage.getItem('token');
          const res = await api.get('/api/users/all', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const appUsers = res.data?.users || res.data || [];
          console.log('App users:', appUsers);

          // 3. Build a SET of SDK participant IDs
          const sdkUserIds = new Set(participants.map(p => p.participant_id));

          // 4. Filter: only show users registered in BOTH app AND SDK
          //    Also exclude the current logged-in user
          const filteredUsers = appUsers.filter(
            user =>
              sdkUserIds.has(user.userid) && user.userid !== currentUserId,
          );

          console.log('Filtered users (app + SDK):', filteredUsers);
          setUsers(filteredUsers);
        } else {
          const rooms = await SamparkChat.GroupChat.getgroups();
          setGroups(rooms || []);
        }
      } catch (e) {
        console.log('Error loading chats:', e);

        // Fallback: if app backend fails, use SDK users directly
        if (chatType === 'peer') {
          try {
            const participants =
              await SamparkChat.PeerChat.getapplictionuserlist();

            // Map SDK participants to a usable format, excluding current user
            const mappedUsers = (participants || [])
              .filter(p => p.participant_id !== currentUserId)
              .map(p => ({
                _id: p._id || p.participant_id,
                userid: p.participant_id,
                name: p.name || p.participant_id,
                avatar: p.avatar || null,
              }));

            setUsers(mappedUsers);
          } catch (fallbackErr) {
            console.log('Fallback also failed:', fallbackErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [chatType, currentUserId]);

  const openChat = item => {
    if (chatType === 'peer') {
      navigation.navigate('ChatScreen', {
        type: 'peer',
        userId: item.userid,
        userName:
          item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
        userAvatar: item.avatar || null,
      });
    } else {
      navigation.navigate('ChatScreen', {
        type: 'group',
        data: item,
      });
    }
  };

  const renderPeerItem = ({ item }) => {
    const isOnline = onlineUsers.has(item.userid);
    const displayName =
      item.name ||
      `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
      item.userid;

    return (
      <TouchableOpacity onPress={() => openChat(item)} style={styles.chatItem}>
        <View style={styles.chatRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <FontAwesomeIcon icon={faCircleUser} size={42} color="#9ca3af" />
            )}
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          {/* User info */}
          <View style={styles.chatInfo}>
            <Text style={styles.chatName}>{displayName}</Text>
            <Text style={styles.chatUserId}>@{item.userid}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity onPress={() => openChat(item)} style={styles.chatItem}>
      <View style={styles.chatRow}>
        <View style={styles.avatarContainer}>
          <FontAwesomeIcon icon={faCircleUser} size={42} color="#9ca3af" />
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.group_name || item.name}</Text>
          <Text style={styles.chatUserId}>
            {item.type === 'private'
              ? '🔐 Private'
              : item.type === 'password'
              ? '🔒 Protected'
              : '🌐 Public'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, chatType === 'peer' && styles.activeTab]}
          onPress={() => setChatType('peer')}
        >
          <Text
            style={[
              styles.tabText,
              chatType === 'peer' && styles.activeTabText,
            ]}
          >
            Peer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, chatType === 'group' && styles.activeTab]}
          onPress={() => setChatType('group')}
        >
          <Text
            style={[
              styles.tabText,
              chatType === 'group' && styles.activeTabText,
            ]}
          >
            Group
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#3b82f6" />
      ) : users.length === 0 && chatType === 'peer' ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={chatType === 'peer' ? users : groups}
          keyExtractor={(item, index) =>
            chatType === 'peer'
              ? item._id?.toString() ||
                item.userid?.toString() ||
                index.toString()
              : item.room_id?.toString() || index.toString()
          }
          renderItem={chatType === 'peer' ? renderPeerItem : renderGroupItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default MessageScreen;
