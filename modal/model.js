const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    channelTitle: {
      type: String,
      required: true,
      trim: true,
    },

    access_token: {
      type: String,
      required: true,
    },

    refresh_token: {
      type: String,
      required: true,
    },

    expiry_date: {
      type: Number, // Google OAuth gives expiry in milliseconds
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
