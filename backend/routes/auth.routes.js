const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// SignUp
router.post('/signup', async (req, res) => {
  const { firstName, lastName, username, email, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password do not match' });
    }

    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const usernameExist = await User.findOne({ username });
    if (usernameExist) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      username,
      userid: username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, firstName: user.firstName, lastName: user.lastName, username: user.username, userid: user.userid },
      process.env.JWT_SECRET,
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        userid: user.userid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// login
router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user exists by either email or username
    const user = await User.findOne({ 
      $or: [{ email: email }, { username: username }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Ensure userid exists (backfill for older accounts)
    if (!user.userid) {
      user.userid = user.username;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, firstName: user.firstName, lastName: user.lastName, username: user.username, userid: user.userid },
      process.env.JWT_SECRET,
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userid: user.userid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// forget password
router.post('/forget-password', async (req, res) => {
  console.log("forget password route entered!")
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User does not Exist' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password updated successfully!' });
    console.log("route exit!")
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users (for chat user list)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '-password').lean();

    // Backfill userid for users that don't have it
    const mappedUsers = users.map(u => ({
      _id: u._id,
      userid: u.userid || u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`,
      username: u.username,
      email: u.email,
      avatar: u.avatar || null,
      bio: u.bio || null,
    }));

    res.json({ users: mappedUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
