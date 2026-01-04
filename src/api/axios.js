import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.2.1:3000', // Android Emulator
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
