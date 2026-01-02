const express = require('express');
const Post = require('../models/Post');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/multer.middleware');

router.post(
  '/createPost',
  authMiddleware,
  upload.single('image'),
  async (req, res) => {
    console.log('route entered');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);
    const { text } = req.body;

    try {
      if (!text) {
        return res.status(400).json({ message: 'Post Text Required' });
      }
      if (!req.user || !req.user.id) {
        return res.status(400).json({ message: 'user not authenticaheyted' });
      }

      const newPost = new Post({
        user: req.user.id,
        text,
        image: req.file ? `/uploads/${req.file.filename}` : null,
      });

      await newPost.save();
      res.status(201).json({
        message: 'Post Created successfully',
        post: newPost,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

router.get('/getAllPost', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate({
        path: 'user',
        select: 'firstName lastName',
      })
      .sort({ createdAt: -1 });
    console.log('POPULATED POSTS:', posts);
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all posts by user
router.get('/getPostByUser', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .populate({
        path: 'user',
        select: 'firstName lastName',
      })
      .sort({ createdAt: -1 });
    console.log('POPULATED POSTS:', posts);
    console.log('Logged in userId:', req.user.id);

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// delete post by id
router.delete('/deletePost/:postId',
  async (req, res) =>{
    try{
      const {postId} = req.params;

      const post = await Post.findById(postId);
      if(!post){
        return res.status(404).json({message: 'Post not found'});
      }
      await Post.findByIdAndDelete(postId);
      res.status(200).json({message: 'Post deleted successfully'});
    }catch(error){
      res.status(500).json({ message: error.message }); 
    }
  }
)

module.exports = router;
