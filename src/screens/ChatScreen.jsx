import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SamparkChat } from '../lib/sampark-chat/sampark-chat.esm.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft,
  faPaperPlane,
  faCircleUser,
  faEllipsisVertical,
  faTrash,
  faPen,
  faCheck,
  faXmark,
  faReply,
} from '@fortawesome/free-solid-svg-icons';
import chatStyles from '../styles/chatScreen.style';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    userId: partnerId,
    userName: partnerName,
    userAvatar,
  } = route.params || {};

  // Current user state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Reply state
  const [replyPreview, setReplyPreview] = useState(null);

  // Delete popup
  const [deleteTargetMessageId, setDeleteTargetMessageId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // Message context menu
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  // Typing states
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isTypingLocal, setIsTypingLocal] = useState(false);

  // Block states
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);

  // Header menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteChatPopup, setShowDeleteChatPopup] = useState(false);

  const flatListRef = useRef(null);

  /* ===================== HELPERS ===================== */

  const formatTime = date =>
    date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getDateLabel = date => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const mapPeerMessage = useCallback(msg => {
    const isFile = SamparkChat.PeerChat.isFileMessage(msg);
    const sdkFileInfo = isFile
      ? SamparkChat.PeerChat.getMessageFileInfo(msg)
      : undefined;

    const mimeType = sdkFileInfo?.mimeType || '';

    return {
      id: msg.getId(),
      senderId: msg.getSenderId(),
      receiverId: msg.getReceiverId(),
      content: isFile
        ? sdkFileInfo?.originalName || 'Attachment'
        : msg.getText(),
      timestamp: new Date(msg.getSentAt()),
      type: isFile
        ? mimeType.startsWith('image/')
          ? 'image'
          : 'file'
        : 'text',
      read: true,
      edited: !!msg.getEditedAt?.(),
      deleted: !!msg.getDeletedAt?.(),
      reactions: msg.reactionsData
        ? msg.reactionsData.reduce((a, r) => {
            a[r.user_id] = r.emoji_id;
            return a;
          }, {})
        : undefined,
      parentMessageId: msg.getParentMessageId?.() || undefined,
      replyType: msg.getReplyType?.() || undefined,
      fileInfo: sdkFileInfo
        ? {
            fileId: sdkFileInfo.fileId,
            originalName: sdkFileInfo.originalName,
            mimeType: sdkFileInfo.mimeType,
            attachmentUrl: sdkFileInfo.attachmentUrl || sdkFileInfo.downloadUrl,
          }
        : undefined,
    };
  }, []);

  const sendTypingEvent = useCallback(
    isTyping => {
      if (isBlockedByMe || isBlockedByPartner || !currentUserId || !partnerId)
        return;

      const typingIndicator = new SamparkChat.TypingIndicator(
        partnerId,
        SamparkChat.RECEIVER_TYPE.USER,
      );

      if (isTyping) {
        SamparkChat.PeerChat.startTyping(typingIndicator);
      } else {
        SamparkChat.PeerChat.endTyping(typingIndicator);
      }
    },
    [isBlockedByMe, isBlockedByPartner, currentUserId, partnerId],
  );

  const lockChatUI = useCallback(() => {
    setIsPartnerTyping(false);
    setIsTypingLocal(false);
    setMessageInput('');
    setReplyPreview(null);
    sendTypingEvent(false);
  }, [sendTypingEvent]);

  /* ===================== LOAD CURRENT USER ===================== */

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode(token);
          setCurrentUserId(decoded.userid || decoded.id || decoded._id);
          setCurrentUserName(
            decoded.name ||
              `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim() ||
              'Me',
          );
        }
      } catch (e) {
        console.log('Error decoding token:', e);
      }
    };
    loadCurrentUser();
  }, []);

  /* ===================== JOIN ROOM ===================== */

  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const id = SamparkChat.PeerChat.joinroom(partnerId);
    setRoomId(id);
    console.log('✅ Joined peer room:', id);

    // Check block status
    checkBlockStatus(id);
  }, [currentUserId, partnerId]);

  /* ===================== CHECK BLOCK STATUS ===================== */

  const checkBlockStatus = async roomId => {
    if (!currentUserId) return;

    try {
      const blockedByMeRequest = new SamparkChat.BlockedUsersRequestBuilder()
        .setLimit(100)
        .setDirection(SamparkChat.BlockedUsersRequest.directions.BLOCKED_BY_ME)
        .build();

      const blockedByMe = await blockedByMeRequest.fetchNext();
      const blockedByMeIds = blockedByMe.map(user => {
        if (typeof user.getUid === 'function') return user.getUid();
        return user.uid || user.userId || user.id;
      });

      const iBlockedPartner = blockedByMeIds.includes(partnerId);

      const blockedMeRequest = new SamparkChat.BlockedUsersRequestBuilder()
        .setLimit(100)
        .setDirection(SamparkChat.BlockedUsersRequest.directions.HAS_BLOCKED_ME)
        .build();

      const blockedMe = await blockedMeRequest.fetchNext();
      const blockedMeIds = blockedMe.map(user => {
        if (typeof user.getUid === 'function') return user.getUid();
        return user.uid || user.userId || user.id;
      });

      const partnerBlockedMe = blockedMeIds.includes(partnerId);

      setIsBlockedByMe(iBlockedPartner);
      setIsBlockedByPartner(partnerBlockedMe);

      if (iBlockedPartner || partnerBlockedMe) {
        lockChatUI();
      }

      console.log('🔍 Block status:', {
        blockedByMe: iBlockedPartner,
        blockedByPartner: partnerBlockedMe,
      });
    } catch (error) {
      console.error('❌ Failed to check block status:', error);
    }
  };

  /* ===================== FETCH HISTORY ===================== */

  useEffect(() => {
    if (!currentUserId || !roomId || !partnerId) return;

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setLoading(true);

        const result = await SamparkChat.PeerChat.fetchPreviousMessages(
          partnerId,
          { limit: 50, page: 1, includeDeleted: true },
        );

        if (cancelled) return;

        const historyMessages = [];

        result.messages.forEach(msg => {
          const isDeleted = !!msg.getDeletedAt?.();
          const isFile = SamparkChat.PeerChat.isFileMessage(msg);
          const sdkFileInfo = isFile
            ? SamparkChat.PeerChat.getMessageFileInfo(msg)
            : undefined;

          const mimeType = sdkFileInfo?.mimeType || '';

          const formattedMessage = {
            id: msg.getId(),
            senderId: msg.getSenderId(),
            receiverId: partnerId,
            content: isDeleted
              ? 'This message was deleted'
              : isFile
              ? sdkFileInfo?.originalName || 'Attachment'
              : msg.getText(),
            deleted: isDeleted,
            timestamp: msg.getSentAt() ? new Date(msg.getSentAt()) : new Date(),
            edited: !!msg.getEditedAt?.(),
            reactions: msg.reactionsData
              ? msg.reactionsData.reduce((acc, r) => {
                  acc[r.user_id] = r.emoji_id;
                  return acc;
                }, {})
              : undefined,
            type: isDeleted
              ? 'text'
              : isFile
              ? mimeType.startsWith('image/')
                ? 'image'
                : 'file'
              : 'text',
            read: true,
            parentMessageId: msg.getParentMessageId?.() || null,
            replyType: msg.getReplyType?.() || null,
            fileInfo:
              !isDeleted && isFile
                ? {
                    fileId: sdkFileInfo?.fileId,
                    originalName: sdkFileInfo?.originalName,
                    mimeType: sdkFileInfo?.mimeType,
                    attachmentUrl:
                      sdkFileInfo?.attachmentUrl || sdkFileInfo?.downloadUrl,
                  }
                : undefined,
          };

          // Only push normal messages and quote replies (skip thread replies)
          if (
            !formattedMessage.parentMessageId ||
            formattedMessage.replyType !== 'thread'
          ) {
            historyMessages.push(formattedMessage);
          }
        });

        setMessages(historyMessages);
      } catch (e) {
        console.warn('⚠️ Failed to fetch chat history:', e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [roomId, partnerId, currentUserId]);

  /* ===================== MESSAGE LISTENERS ===================== */

  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const LISTENER_ID = `CHAT_${currentUserId}_${partnerId}`;

    SamparkChat.addPeerMessageListener(LISTENER_ID, {
      onTextMessageReceived: msg => {
        if (isBlockedByMe || isBlockedByPartner) return;

        const formattedMessage = mapPeerMessage(msg);

        // Skip our own messages (handled via optimistic send)
        if (formattedMessage.senderId === currentUserId) return;

        setMessages(prev => {
          if (prev.some(m => m.id === formattedMessage.id)) return prev;
          return [...prev, formattedMessage];
        });
      },

      onMediaMessageReceived: msg => {
        if (isBlockedByMe || isBlockedByPartner) return;

        const formattedMessage = mapPeerMessage(msg);

        setMessages(prev => {
          if (prev.some(m => m.id === formattedMessage.id)) return prev;
          return [...prev, formattedMessage];
        });
      },

      onMessageEdited: msg => {
        setMessages(prev =>
          prev.map(m =>
            m.id === msg.getId()
              ? { ...m, content: msg.getText(), edited: true }
              : m,
          ),
        );
      },

      onMessageDeleted: msg => {
        setMessages(prev =>
          prev.map(m =>
            m.id === msg.getId()
              ? {
                  ...m,
                  content: 'This message was deleted',
                  deleted: true,
                  type: 'text',
                  fileInfo: undefined,
                }
              : m,
          ),
        );
      },

      onTypingStarted: typingEvent => {
        const sender = typingEvent.getSender?.() || typingEvent.sender;
        if (!sender) return;
        const senderUid = sender.uid;
        if (senderUid === currentUserId) return;
        if (senderUid === partnerId) {
          setIsPartnerTyping(true);
        }
      },

      onTypingEnded: typingEvent => {
        const sender = typingEvent.getSender?.() || typingEvent.sender;
        if (!sender) return;
        const senderUid = sender.uid;
        if (senderUid === currentUserId) return;
        if (senderUid === partnerId) {
          setIsPartnerTyping(false);
        }
      },

      onUserBlocked: blockData => {
        if (
          blockData.blocker_user_id === currentUserId &&
          blockData.blocked_user_id === partnerId
        ) {
          setIsBlockedByMe(true);
          lockChatUI();
        }
        if (
          blockData.blocker_user_id === partnerId &&
          blockData.blocked_user_id === currentUserId
        ) {
          setIsBlockedByPartner(true);
          lockChatUI();
        }
      },

      onUserUnblocked: unblockData => {
        if (
          unblockData.blocker_user_id === currentUserId &&
          unblockData.blocked_user_id === partnerId
        ) {
          setIsBlockedByMe(false);
        }
        if (
          unblockData.blocker_user_id === partnerId &&
          unblockData.blocked_user_id === currentUserId
        ) {
          setIsBlockedByPartner(false);
        }
      },
    });

    return () => {
      SamparkChat.PeerChat.removeMessageListener(LISTENER_ID);
    };
  }, [
    currentUserId,
    partnerId,
    isBlockedByMe,
    isBlockedByPartner,
    mapPeerMessage,
    lockChatUI,
  ]);

  /* ===================== TYPING TIMEOUT ===================== */

  useEffect(() => {
    if (!isTypingLocal || !currentUserId) return;

    sendTypingEvent(true);

    const timeout = setTimeout(() => {
      sendTypingEvent(false);
      setIsTypingLocal(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isTypingLocal, currentUserId, partnerId, sendTypingEvent]);

  /* ===================== SEND MESSAGE ===================== */

  const handleSend = async () => {
    if (isBlockedByMe || isBlockedByPartner) return;
    if (!messageInput.trim() || !currentUserId) return;

    const text = messageInput;
    const now = new Date();
    const optimisticId = 'optimistic-' + now.getTime();

    const optimisticMessage = {
      id: optimisticId,
      senderId: currentUserId,
      receiverId: partnerId,
      content: text,
      timestamp: now,
      type: 'text',
      read: false,
    };

    // Stop typing indicator
    const typingIndicator = new SamparkChat.TypingIndicator(
      partnerId,
      SamparkChat.RECEIVER_TYPE.USER,
    );
    SamparkChat.PeerChat.endTyping(typingIndicator);
    setIsTypingLocal(false);

    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');

    // Build SDK message
    const msg = new SamparkChat.TextMessage(
      partnerId,
      text,
      SamparkChat.RECEIVER_TYPE.USER,
    );

    if (replyPreview) {
      msg.setParentMessageId(replyPreview.id);
      msg.setReplyType('quote');
    }

    try {
      const sent = await SamparkChat.PeerChat.sendMessage(msg);
      const realMessage = mapPeerMessage(sent);

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => (m.id === optimisticId ? { ...realMessage } : m)),
      );
    } catch (e) {
      const message = e?.message || e?.response?.data?.message || '';
      if (message.toLowerCase().includes('blocked')) {
        setIsBlockedByPartner(true);
        return;
      }
      console.error('❌ Send message failed:', e);
    }

    setReplyPreview(null);
  };

  /* ===================== EDIT MESSAGE ===================== */

  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;

    const msg = new SamparkChat.TextMessage(
      partnerId,
      editingText,
      SamparkChat.RECEIVER_TYPE.USER,
    );
    msg.setId(editingMessageId);

    try {
      await SamparkChat.PeerChat.editMessage(msg);
    } catch (e) {
      console.error('❌ Edit message failed:', e);
    }

    setEditingMessageId(null);
    setEditingText('');
  };

  /* ===================== DELETE MESSAGE ===================== */

  const deleteMessage = async (id, scope) => {
    setSelectedMessageId(null);
    setShowDeletePopup(false);
    setDeleteTargetMessageId(null);

    // Optimistic UI
    if (scope === 'me') {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
    if (scope === 'everyone') {
      setMessages(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, content: 'This message was deleted', deleted: true }
            : m,
        ),
      );
    }

    try {
      await SamparkChat.PeerChat.deleteMessage(id, scope, partnerId);
    } catch (e) {
      console.error('❌ Delete message failed:', e);
    }
  };

  /* ===================== BLOCK/UNBLOCK ===================== */

  const handleBlockUser = async () => {
    if (!roomId) return;
    try {
      await SamparkChat.PeerChat.blockUsers([partnerId], roomId);
      setShowBlockConfirm(false);
      lockChatUI();
    } catch (e) {
      console.error('❌ Block user failed:', e);
    }
  };

  const handleUnblockUser = async () => {
    if (!roomId) return;
    try {
      await SamparkChat.PeerChat.unblockUsers([partnerId], roomId);
    } catch (e) {
      console.error('❌ Unblock user failed:', e);
    }
  };

  /* ===================== DELETE CONVERSATION ===================== */

  const handleDeleteConversation = async () => {
    try {
      await SamparkChat.PeerChat.deleteConversation(partnerId, 'user');
      setMessages([]);
      setShowDeleteChatPopup(false);
      console.log('🗑️ Chat deleted');
    } catch (e) {
      console.error('❌ Delete conversation failed:', e);
    }
  };

  /* ===================== SCROLL TO BOTTOM ===================== */

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  /* ===================== RENDER MESSAGE BUBBLE ===================== */

  const renderMessage = ({ item: msg, index }) => {
    const isOwn = msg.senderId === currentUserId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDateSeparator =
      !prevMsg || !isSameDay(msg.timestamp, prevMsg.timestamp);

    // Find parent message if this is a quote reply
    const parentMessage =
      msg.parentMessageId && msg.replyType === 'quote'
        ? messages.find(m => m.id === msg.parentMessageId)
        : null;

    return (
      <View>
        {/* Date Separator */}
        {showDateSeparator && (
          <View style={chatStyles.dateSeparator}>
            <View style={chatStyles.dateSeparatorLine} />
            <Text style={chatStyles.dateSeparatorText}>
              {getDateLabel(msg.timestamp)}
            </Text>
            <View style={chatStyles.dateSeparatorLine} />
          </View>
        )}

        {/* Message Bubble */}
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => {
            if (!msg.deleted) {
              setSelectedMessageId(
                selectedMessageId === msg.id ? null : msg.id,
              );
            }
          }}
          style={[
            chatStyles.messageBubbleContainer,
            isOwn
              ? chatStyles.ownMessageContainer
              : chatStyles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              chatStyles.messageBubble,
              msg.deleted
                ? chatStyles.deletedBubble
                : isOwn
                ? chatStyles.ownBubble
                : chatStyles.otherBubble,
            ]}
          >
            {/* Quote Reply Preview */}
            {parentMessage && (
              <View style={chatStyles.quoteReplyContainer}>
                <Text style={chatStyles.quoteReplyAuthor}>
                  {parentMessage.senderId === currentUserId
                    ? 'You'
                    : partnerName}
                </Text>
                <Text style={chatStyles.quoteReplyText} numberOfLines={2}>
                  {parentMessage.content}
                </Text>
              </View>
            )}

            {/* Message Content */}
            <Text
              style={[
                chatStyles.messageText,
                msg.deleted && chatStyles.deletedText,
                isOwn && !msg.deleted && chatStyles.ownMessageText,
              ]}
            >
              {msg.content}
            </Text>

            {/* Timestamp & Edited */}
            <View style={chatStyles.messageFooter}>
              {msg.edited && (
                <Text
                  style={[
                    chatStyles.editedLabel,
                    isOwn && chatStyles.ownEditedLabel,
                  ]}
                >
                  Edited
                </Text>
              )}
              <Text
                style={[
                  chatStyles.timestampText,
                  isOwn && chatStyles.ownTimestamp,
                ]}
              >
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          </View>

          {/* Context Menu */}
          {selectedMessageId === msg.id && !msg.deleted && (
            <View
              style={[
                chatStyles.contextMenu,
                isOwn ? chatStyles.contextMenuOwn : chatStyles.contextMenuOther,
              ]}
            >
              {/* Reply */}
              <TouchableOpacity
                style={chatStyles.contextMenuItem}
                onPress={() => {
                  setReplyPreview(msg);
                  setSelectedMessageId(null);
                }}
              >
                <FontAwesomeIcon icon={faReply} size={14} color="#6b7280" />
                <Text style={chatStyles.contextMenuText}>Reply</Text>
              </TouchableOpacity>

              {/* Edit (own messages only) */}
              {isOwn && (
                <TouchableOpacity
                  style={chatStyles.contextMenuItem}
                  onPress={() => {
                    setEditingMessageId(msg.id);
                    setEditingText(msg.content);
                    setSelectedMessageId(null);
                  }}
                >
                  <FontAwesomeIcon icon={faPen} size={14} color="#6b7280" />
                  <Text style={chatStyles.contextMenuText}>Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete (own messages only) */}
              {isOwn && (
                <TouchableOpacity
                  style={chatStyles.contextMenuItem}
                  onPress={() => {
                    setDeleteTargetMessageId(msg.id);
                    setShowDeletePopup(true);
                    setSelectedMessageId(null);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                  <Text
                    style={[chatStyles.contextMenuText, { color: '#ef4444' }]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  /* ===================== RENDER ===================== */

  return (
    <KeyboardAvoidingView
      style={chatStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ========= HEADER ========= */}
      <View style={chatStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={chatStyles.backButton}
        >
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="#1f2937" />
        </TouchableOpacity>

        <View style={chatStyles.headerAvatar}>
          <FontAwesomeIcon icon={faCircleUser} size={36} color="#9ca3af" />
        </View>

        <View style={chatStyles.headerInfo}>
          <Text style={chatStyles.headerName}>{partnerName || partnerId}</Text>
          {isPartnerTyping ? (
            <Text style={chatStyles.typingText}>typing…</Text>
          ) : (
            <Text style={chatStyles.headerUserId}>@{partnerId}</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setShowHeaderMenu(!showHeaderMenu)}
          style={chatStyles.menuButton}
        >
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>

        {/* Header dropdown menu */}
        {showHeaderMenu && (
          <View style={chatStyles.headerDropdown}>
            {!isBlockedByMe ? (
              <TouchableOpacity
                style={chatStyles.headerDropdownItem}
                onPress={() => {
                  setShowHeaderMenu(false);
                  setShowBlockConfirm(true);
                }}
              >
                <Text style={chatStyles.headerDropdownText}>Block</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={chatStyles.headerDropdownItem}
                onPress={() => {
                  setShowHeaderMenu(false);
                  handleUnblockUser();
                }}
              >
                <Text style={chatStyles.headerDropdownText}>Unblock</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={chatStyles.headerDropdownItem}
              onPress={() => {
                setShowHeaderMenu(false);
                setShowDeleteChatPopup(true);
              }}
            >
              <Text
                style={[chatStyles.headerDropdownText, { color: '#ef4444' }]}
              >
                Delete chat
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Block banners */}
      {isBlockedByMe && (
        <View style={chatStyles.blockBanner}>
          <Text style={chatStyles.blockBannerText}>You blocked this user</Text>
        </View>
      )}
      {isBlockedByPartner && (
        <View style={[chatStyles.blockBanner, { backgroundColor: '#fef2f2' }]}>
          <Text style={chatStyles.blockBannerText}>
            {partnerName} blocked you
          </Text>
        </View>
      )}

      {/* ========= MESSAGES LIST ========= */}
      {loading ? (
        <View style={chatStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={chatStyles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* ========= EDIT PREVIEW ========= */}
      {editingMessageId && (
        <View style={chatStyles.editPreview}>
          <View style={chatStyles.editPreviewContent}>
            <Text style={chatStyles.editPreviewLabel}>Editing message</Text>
            <Text style={chatStyles.editPreviewText} numberOfLines={1}>
              {editingText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessageId(null);
              setEditingText('');
            }}
          >
            <FontAwesomeIcon icon={faXmark} size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* ========= REPLY PREVIEW ========= */}
      {replyPreview && (
        <View style={chatStyles.replyPreview}>
          <View style={chatStyles.replyPreviewContent}>
            <Text style={chatStyles.replyPreviewLabel}>Reply</Text>
            <Text style={chatStyles.replyPreviewText} numberOfLines={1}>
              {replyPreview.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyPreview(null)}>
            <FontAwesomeIcon icon={faXmark} size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* ========= INPUT ========= */}
      <View style={chatStyles.inputContainer}>
        <TextInput
          style={chatStyles.input}
          value={editingMessageId ? editingText : messageInput}
          onChangeText={value => {
            if (editingMessageId) {
              setEditingText(value);
            } else {
              setMessageInput(value);
              setIsTypingLocal(true);
            }
          }}
          placeholder={
            isBlockedByMe || isBlockedByPartner
              ? 'Chat is blocked'
              : editingMessageId
              ? 'Edit message...'
              : 'Type a message...'
          }
          placeholderTextColor="#9ca3af"
          editable={!isBlockedByMe && !isBlockedByPartner}
          multiline
          onSubmitEditing={() => {
            editingMessageId ? saveEdit() : handleSend();
          }}
          returnKeyType="send"
        />

        {editingMessageId ? (
          <View style={chatStyles.editActions}>
            <TouchableOpacity
              style={chatStyles.saveEditButton}
              onPress={saveEdit}
            >
              <FontAwesomeIcon icon={faCheck} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={chatStyles.cancelEditButton}
              onPress={() => {
                setEditingMessageId(null);
                setEditingText('');
              }}
            >
              <FontAwesomeIcon icon={faXmark} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              chatStyles.sendButton,
              (!messageInput.trim() || isBlockedByMe || isBlockedByPartner) &&
                chatStyles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={
              !messageInput.trim() || isBlockedByMe || isBlockedByPartner
            }
          >
            <FontAwesomeIcon icon={faPaperPlane} size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ========= DELETE MESSAGE MODAL ========= */}
      <Modal visible={showDeletePopup} transparent animationType="fade">
        <View style={chatStyles.modalOverlay}>
          <View style={chatStyles.modalContent}>
            <Text style={chatStyles.modalTitle}>Delete message?</Text>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={() => {
                if (deleteTargetMessageId) {
                  deleteMessage(deleteTargetMessageId, 'me');
                }
              }}
            >
              <Text style={chatStyles.modalOptionText}>Delete for me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={() => {
                if (deleteTargetMessageId) {
                  deleteMessage(deleteTargetMessageId, 'everyone');
                }
              }}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#ef4444' }]}>
                Delete for everyone
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={() => {
                setShowDeletePopup(false);
                setDeleteTargetMessageId(null);
              }}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#9ca3af' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========= BLOCK CONFIRM MODAL ========= */}
      <Modal visible={showBlockConfirm} transparent animationType="fade">
        <View style={chatStyles.modalOverlay}>
          <View style={chatStyles.modalContent}>
            <Text style={chatStyles.modalTitle}>
              Block {partnerName || partnerId}?
            </Text>
            <Text style={chatStyles.modalDescription}>
              You won't be able to send or receive messages from this user.
            </Text>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={handleBlockUser}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#ef4444' }]}>
                Block
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={() => setShowBlockConfirm(false)}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#9ca3af' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========= DELETE CHAT MODAL ========= */}
      <Modal visible={showDeleteChatPopup} transparent animationType="fade">
        <View style={chatStyles.modalOverlay}>
          <View style={chatStyles.modalContent}>
            <Text style={chatStyles.modalTitle}>Delete chat?</Text>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={handleDeleteConversation}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#ef4444' }]}>
                Delete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={chatStyles.modalOption}
              onPress={() => setShowDeleteChatPopup(false)}
            >
              <Text style={[chatStyles.modalOptionText, { color: '#9ca3af' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;
