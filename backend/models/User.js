const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true }, // for manual signup
    email: { type: String, unique: true, sparse: true }, // OAuth and manual
    password: { type: String }, // only required for local signup

    // OAuth fields
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },

    profilePicture: { type: String }, // optional
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
