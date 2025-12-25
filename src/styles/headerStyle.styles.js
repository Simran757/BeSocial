import { StyleSheet } from "react-native";

const headerStyle = StyleSheet.create({
header: {
    margin:0,
    padding:0,
    flexDirection: "row",
    height:60,
    alignItems: "center",
    justifyContent:"center",   
},
headerText:{
    fontSize:40,
    fontWeight:'bold',
    flexGrow: 2,
    alignItems:"center",
    justifyContent:"center",
},
 button: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    marginLeft:10,
    padding: 10,
  },

  buttonText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    color: "#000",
  }
});

export default headerStyle;