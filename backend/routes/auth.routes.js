const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// SignUp
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password do not match' });
    }

    const userExist = await User.findOne({ email });

    if (userExist) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, firstName: user.firstName, lastName: user.lastName },
      process.env.JWT_SECRET,
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, firstName: user.firstName, lastName: user.lastName },
      process.env.JWT_SECRET,
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// forget password
router.post('/forget-password', async (req, res) => {
  console.log("forget password route entered!")
  const { email, newPassword} = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User does not Exist' });
    }
    const salt= await bcrypt.genSalt(10);
    user.password= await bcrypt.hash(newPassword,salt);

    await user.save();
    res.json({message:'Password updated successfully!'});
    console.log("route exit!")
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
