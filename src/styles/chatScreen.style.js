import { StyleSheet } from "react-native";

const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop:16,
    paddingBottom:30,
  },

  /* ========= HEADER ========= */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
    position: "relative",
  },

  backButton: {
    padding: 8,
    marginRight: 4,
  },

  headerAvatar: {
    marginRight: 10,
  },

  headerInfo: {
    flex: 1,
  },

  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },

  headerUserId: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 1,
  },

  typingText: {
    fontSize: 13,
    color: "#3b82f6",
    fontStyle: "italic",
    marginTop: 1,
  },

  menuButton: {
    padding: 8,
  },

  headerDropdown: {
    position: "absolute",
    top: 56,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 100,
    minWidth: 150,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  headerDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  headerDropdownText: {
    fontSize: 14,
    color: "#374151",
  },

  /* ========= BLOCK BANNER ========= */
  blockBanner: {
    backgroundColor: "#fefce8",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  blockBannerText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },

  /* ========= LOADING ========= */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* ========= MESSAGES LIST ========= */
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },

  /* ========= DATE SEPARATOR ========= */
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },

  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  dateSeparatorText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },

  /* ========= MESSAGE BUBBLE ========= */
  messageBubbleContainer: {
    marginBottom: 6,
    maxWidth: "78%",
  },

  ownMessageContainer: {
    alignSelf: "flex-end",
  },

  otherMessageContainer: {
    alignSelf: "flex-start",
  },

  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },

  ownBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },

  otherBubble: {
    backgroundColor: "#f3f4f6",
    borderBottomLeftRadius: 4,
  },

  deletedBubble: {
    backgroundColor: "#e5e7eb",
  },

  messageText: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 20,
  },

  ownMessageText: {
    color: "#fff",
  },

  deletedText: {
    fontStyle: "italic",
    color: "#9ca3af",
  },

  /* ========= QUOTE REPLY ========= */
  quoteReplyContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },

  quoteReplyAuthor: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3b82f6",
    marginBottom: 2,
  },

  quoteReplyText: {
    fontSize: 12,
    color: "#6b7280",
  },

  /* ========= MESSAGE FOOTER ========= */
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },

  editedLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginRight: 4,
  },

  ownEditedLabel: {
    color: "rgba(255,255,255,0.7)",
  },

  timestampText: {
    fontSize: 10,
    color: "#9ca3af",
  },

  ownTimestamp: {
    color: "rgba(255,255,255,0.7)",
  },

  /* ========= CONTEXT MENU ========= */
  contextMenu: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  contextMenuOwn: {
    alignSelf: "flex-end",
  },

  contextMenuOther: {
    alignSelf: "flex-start",
  },

  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },

  contextMenuText: {
    fontSize: 13,
    color: "#374151",
  },

  /* ========= EDIT PREVIEW ========= */
  editPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  editPreviewContent: {
    flex: 1,
  },

  editPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },

  editPreviewText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  /* ========= REPLY PREVIEW ========= */
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  replyPreviewContent: {
    flex: 1,
  },

  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },

  replyPreviewText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  /* ========= INPUT ========= */
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
    gap: 8,
  },

  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#1f2937",
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#93c5fd",
  },

  editActions: {
    flexDirection: "row",
    gap: 6,
  },

  saveEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#6b7280",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ========= MODALS ========= */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 280,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  modalDescription: {
    fontSize: 13,
    color: "#6b7280",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },

  modalOptionText: {
    fontSize: 14,
    color: "#374151",
  },
});

export default chatStyles;
