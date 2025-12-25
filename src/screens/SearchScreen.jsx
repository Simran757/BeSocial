import { StyleSheet, TextInput, View } from 'react-native'
import React from 'react'
import Header from '../components/Header'
import home from "../styles/home.style";
import search from "../styles/search.style";
import messageScreen from '../styles/messageScreen.style';
// import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
const SearchScreen = () => {
  return (
    <View style={home.container}>
      <Header />
      
      <View style={messageScreen.lineContainer} />

      {/* <FontAwesomeIcon icon={faMagnifyingGlass} />     */}
      
      <TextInput style = {search.box} placeholder= "Search"></TextInput>
    </View>

  
  )
}

export default SearchScreen;

