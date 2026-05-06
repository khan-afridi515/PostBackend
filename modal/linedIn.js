const mongoose = require('mongoose');

const linkedInSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // your user model
      required: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    expiresIn: {
      type: Number, // seconds
    },

    // optional but recommended
    tokenType: {
      type: String,
      default: "Bearer",
    },

    rawProfile: {
      type: Object,
    },

    // store organizations/pages
    organizations: [
      {
        orgId: String,        // LinkedIn organization ID
        name: String,         // optional (if you fetch name)
        urn: String,          // urn:li:organization:xxx
        role: String,         // ADMIN / MEMBER
      },
    ],

    // optional (for refresh / debugging)
    rawProfile: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LinkedInAccount", linkedInSchema);