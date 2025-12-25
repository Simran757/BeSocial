const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    image: { type: String },
    text: { type: String, required: true },
    activity: {
      likeCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Post', PostSchema);
