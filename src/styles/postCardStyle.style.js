import { StyleSheet } from 'react-native';

const postCardStyle = StyleSheet.create({
  container: {
    borderColor: 'black',
    borderRadius: 10,
    padding: 10,
    margin: 5,
    borderWidth: 0.1,
  },
  userContainer: {
    padding: 10,
    margin: 5,
  },

  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 20,
  },
  mainText: {
    padding: 10,
    marginTop: 10,
    fontSize: 16,
  },
  description: {
    fontSize: 13,
    fontWeight: 'light',
    color: 'gray',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  postImage: {
    width: 'auto',
  },
  iconContainer: {
    borderWidth: 0.1,
    width: 50,
    height: 50,
    borderRadius: 50,
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  buttonStyle: {
    margin: 5,
    flexDirection: 'row',
    padding: 5,
  },
  textStyle: {
    margin: 10,
  },
  dotIcon: {
    marginLeft: 'auto',
    padding: 10,
  },
});
export default postCardStyle;
