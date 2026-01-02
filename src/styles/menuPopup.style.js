import { StyleSheet, Platform } from 'react-native';

const menuPopup = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 160,

    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    // Elevation (Android)
    elevation: 8,
  },

  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  menuText: {
    fontSize: 15,
    color: '#222',
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 8,
  },

  dangerText: {
    color: '#E53935',
    fontWeight: '500',
  },
});

export default menuPopup;
