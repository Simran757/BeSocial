import { StyleSheet } from 'react-native';
const createPost = StyleSheet.create({
  postContainer: {
    height: 'auto',
    margin: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer : {
    padding:10,
    margin:5,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 26,
  },
  mainContainer: {
    height: 'auto',
    margin: 20,
    borderWidth: 0.5,
    borderColor: 'grey',
    borderRadius: 10,
  },
  textContainer: {
    fontSize: 18,
  },
  imageContainer: {
    justifyContent: 'flex-end',
    padding: 20,
  },
  buttonContainer: {
    padding: 20,
    margin: 10,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    marginLeft: 10,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
});

export default createPost;
