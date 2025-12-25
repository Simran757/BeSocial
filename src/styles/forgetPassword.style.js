import { StyleSheet } from 'react-native';
const forgetPassword = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom:40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconContainer: {
    padding: 10,
    margin: 5,
  },
  formConatiner:{
    borderWidth:0.4,
    borderColor:"grey",
    borderRadius:10, 
    padding:20,
  },
  inputContainer:{
    borderWidth:0.5,
    borderColor:"grey",
    flexDirection:"row",
    fontSize:16,
    margin:10,
  },
  inputBox:{
    flexDirection:"row",
    alignItems:"center",
    fontSize:16,
  },
  iconContainer:{
    margin:5,
    padding:5,
  }
});

export default forgetPassword;
