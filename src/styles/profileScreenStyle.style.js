import { StyleSheet } from "react-native";
const profileScreenStyle = StyleSheet.create({

    mainContainer:{
        borderWidth:0.5,
        borderRadius:10,
        borderColor:"grey",
        padding:20,
        margin: 20,
    },
    userNameContainer:{
        fontSize:20,
        fontWeight:"bold",
    },
    description:{
        color:"grey",
        fontSize:15,
    },
    profileContainer:{
        flexDirection:"row",
        alignItems:"center",
        borderWidth:0.1,
        borderColor:"grey",
        borderRadius:10,
    },
    profileIcon:{
        padding:10,
        margin:10,
    },
    profileText:{
        padding:10,
    },
});

export default profileScreenStyle;