import { StyleSheet } from "react-native";

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",   
    alignItems: "center",   
    margin:0,
    padding:0    
  },

  form: {
    width: "90%",
    maxWidth: 360,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#fff",
    fontSize:16,
  },

  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },

  buttonText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },

  loginContainer: {
  marginTop: 20,
  flexDirection: "row",
  justifyContent: "center",
  },

loginText: {
  fontSize: 14,
  color: "#555",
 },

loginLink: {
  fontSize: 14,
  color: "#1E90FF",   // link blue
  fontWeight: "bold",
  marginLeft: 4,
  textDecorationLine: "underline",
},
error: {
  color: "red",
  fontSize: 12,
  marginBottom: 8,
},
passwordContainer: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  paddingHorizontal: 12,
  marginBottom: 8,
},

passwordInput: {
  flex: 1,
  height: 48,
},

successContainer:{
  borderWidth:0.1,
  borderRadius:10,
  padding:20,
  margin:10,
},
successText:{
  color:"green",
  fontSize:15,
  fontWeight:"bold",
},



});

export default authStyles;
