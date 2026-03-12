import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.0.2.2:5000', // Android Emulator
  timeout: 10000,
});

export default api;
