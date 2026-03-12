const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        firstName: {type: String, required: true},
        lastName: {type: String, required: true},
        username: {type: String, required: true, unique: true},
        userid: {type: String, unique: true, sparse: true},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        bio: {type: String},
        avatar: {type: String},
        posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post"}]
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", UserSchema);