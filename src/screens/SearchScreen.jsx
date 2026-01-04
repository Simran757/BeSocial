import { ActivityIndicator, FlatList, TextInput, View } from 'react-native';
import Header from '../components/Header';
import home from '../styles/home.style';
import search from '../styles/search.style';
import messageScreen from '../styles/messageScreen.style';
import React, { useState } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  React.useEffect(() => {
    if (query.trim().length === 0) {
      setUsers([]);
      return;
    }
    const delay = setTimeout(() => {
      searchUsers();
    }, 500);
    return () => clearTimeout(delay);
  }, [query]);
  const searchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/users/search?q=${query}`,
      );
      if (res.status === 200) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={home.container}>
      <Header />

      <View style={messageScreen.lineContainer} />

      {/* <FontAwesomeIcon icon={faMagnifyingGlass} />     */}
      <View>
        <TextInput
          style={search.box}
          placeholder="Search"
          value={query}
          onChangeText={setQuery}
        ></TextInput>
      </View>
      {loading && <ActivityIndicator style={{ marginTop: 20 }} /> }
      {!loading && users.length === 0 && query.length > 0 && (
        <Text style={{ marginTop: 20, textAlign: 'center' }}>No users found</Text>
      )}
      <FlatList 
      data={users}
      keyExtractor={(item) => item._id}
      renderItem={({item}) =>(
        <View></View>
      )}
      />

    </View>
  );
};

export default SearchScreen;
