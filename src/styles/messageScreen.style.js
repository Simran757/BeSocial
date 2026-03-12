import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding:20,
  },

  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingTop:16,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  activeTab: {
    borderBottomColor: "#3b82f6",
    backgroundColor: "#f0f7ff",
  },

  tabText: {
    fontWeight: "600",
    fontSize: 15,
    color: "#9ca3af",
  },

  activeTabText: {
    color: "#3b82f6",
  },

  loader: {
    marginTop: 40,
  },

  chatItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },

  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },

  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },

  chatUserId: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },

  listContent: {
    paddingBottom: 20,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },

  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },
});

export default styles;