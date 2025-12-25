const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/post', require('./routes/post.routes'));
app.use('/uploads', express.static('D:/uploads'));


const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
