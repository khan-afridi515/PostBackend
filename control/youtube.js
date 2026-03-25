const axios = require('axios');
const qs = require('qs');
const fs = require('fs');
const User = require("../modal/model");
const { google } = require('googleapis');
const dotenv = require('dotenv');
const Activity = require('../modal/activity');

dotenv.config();




const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );


  exports.connectYoutube = (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
      ]
    });
  
    res.redirect(url);
  };
  
  
  
  exports.youtubeCallback = async (req, res) => {
    const { code } = req.query;
  
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
  
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  
    const response = await youtube.channels.list({
      part: "snippet",
      mine: true
    });
  
    const channel = response.data.items[0];
  
    await storeToken({
      channel: channel.id,
      channelTitle: channel.snippet.title,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
  
    res.redirect("http://localhost:5173/youtubeChanel");
  };
  
  exports.getChannels = async (req, res) => {
    const channels = await User.find(
      {},
      { _id: 0, channel: 1, channelTitle: 1 }
    );
  
    console.log("mychannels", channels);
  
    res.json(channels);
  };
  
  
  const storeToken = async (tokenData) => {
    const existing = await User.findOne({ channel: tokenData.channel });
    if (existing) {
      existing.channelTitle = tokenData.channelTitle; 
      existing.access_token = tokenData.access_token;
      existing.refresh_token = tokenData.refresh_token;
      existing.expiry_date = tokenData.expiry_date;
      await existing.save();
    } else {
      await new User(tokenData).save();
    }
  };
  
  const getTokenFromDB = async (channel) => {
    const token = await User.findOne({ channel });
    if (!token) throw new Error(`No token found for channel: ${channel}`);
    console.log("Token retrieved from DB:", token);
    return token;
  };
  
  
  
  exports.uploadVideo = async (req, res) => {
    try {
      const { channel, title, description, privacyStatus, madeForKids } = req.body;
  
      if (!req.files || !req.files.video) {
        return res.status(400).json({ error: "Video file missing" });
      }

      console.log("This is the req.body", req.body);
  
      const videoFile = req.files.video[0];
  
      if (!channel || !title) {
        return res.status(400).json({ error: "Required fields missing" });
      }
  
      const token = await getTokenFromDB(channel);
      if (!token) {
        return res.status(404).json({ error: "Channel not authorized" });
      }
  
   
oauth2Client.setCredentials({
  access_token: token.access_token,
  refresh_token: token.refresh_token,
  expiry_date: token.expiry_date
});

// Refresh access token if expired
if (Date.now() >= token.expiry_date) {
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  // Update token in DB
  token.access_token = credentials.access_token;
  token.expiry_date = credentials.expiry_date;
  await token.save();
}
  
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  
      /* 🎥 Upload to YouTube (LOCAL FILE) */
      const response = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
          snippet: {
            title,
            description,
            categoryId: "22"
          },
          status: {
            privacyStatus: privacyStatus || "private",
            selfDeclaredMadeForKids:
              madeForKids === "true" || madeForKids === true
          }
        },
        media: {
          body: fs.createReadStream(videoFile.path)
        }
      });
  
      /* ☁ Optional: upload backup to Cloudinary */
      // const cloudRes = await uploadToCloudinary(videoFile.path, "video");
  
      /* 🧹 Clean local file */
      fs.unlink(videoFile.path, () => {});
  
      res.json({
        success: true,
        videoId: response.data.id,
        message: "Video uploaded successfully"
      });

      await Activity.create({
        platform: "youtube",
        message: title,
        postId: response.data.id,
        status: "success"
      });
  
    } catch (err) {
      console.error("YouTube upload error:", err.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: err.response?.data || err.message
      });
    }
  };
  
  
  
  
  
  
  
  exports.deleteAllChannels = async (req, res) => {
    try {
      const result = await User.deleteMany({});
  
      res.status(200).json({
        success: true,
        message: "All YouTube channels deleted successfully",
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error("Delete all channels error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete channels"
      });
    }
  };
  