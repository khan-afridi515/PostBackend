const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["facebook", "instagram", "youtube", "linkedin", "twitter"],
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    postId: {
      type: String, // ID returned from platform
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  { timestamps: true } // 👈 gives createdAt
);

module.exports = mongoose.model("Activity", activitySchema);