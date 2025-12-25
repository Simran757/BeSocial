import { StyleSheet } from 'react-native';

const settingStyle = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
    flex: 1,
    justifyContent: 'flex-end',
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
  popUpbutton: {
    borderWidth: 1,
    borderColor: 'black',
    color: 'rgba(0, 0, 0, 0)',
    fontWeight:"bold",
    padding: 10,
    borderRadius: 10,
    marginTop: 5,
    marginLeft: 5,
    borderRadius: 10,
  },
  popUpText: {
    color: 'rgba(192, 180, 16, 1)',
    fontWeight: 'bold',
    fontSize: 20,
    padding: 10,
    margin: 10,
  },
  popUpBox: {
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBlockColor: 'grey',
    borderRadius: 10,
    padding: 10,
    margin: 10,
    
  },
  boxContainer:{
    paddingTop:300,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title:{
    fontSize:24,
    fontWeight:"bold",
  },
  iconContainer:{
    padding:10,
    margin: 5,
  },
});

export default settingStyle;
