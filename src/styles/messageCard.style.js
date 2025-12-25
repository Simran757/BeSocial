import { StyleSheet } from "react-native";

const messageCardStyle = StyleSheet.create({
 container:{
    borderColor:"black",
    borderRadius: 10,
    padding: 5,
    flexDirection:"row",
    margin:5,
   
    borderWidth: 0.1,   
 },
 userContainer:{
   padding:10,
   margin:10,
 },

 mainText:{
    padding:5,
    marginTop:5,
    color:"grey",
    fontWeight:"bold",
 },

 userName:{
    fontWeight:"bold",
    fontSize: 20, 
 },
 textArea:{
   flexDirection:"column",
 },
 iconArea:{
   padding:10,
 },
});
export  default messageCardStyle;