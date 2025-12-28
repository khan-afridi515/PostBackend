const axios = require('axios');
const qs = require('qs');
const fs = require('fs');
const FormData = require('form-data');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;



dotenv.config();

cloudinary.config({

  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET,
  
  });



exports.getPagePost = async (req, res) => {
  try {
    const { content, mypageToken, myPageId } = req.body;

    // FIX: files must be extracted from req.files
    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];

    console.log("Incoming:", content, mypageToken, myPageId, imageFile, videoFile);

    if (!content || !mypageToken || !myPageId) {
      return res.status(400).json({ error: "Missing content, token or page ID" });
    }

    // -------------------------------------------------------
    // CASE 1: TEXT ONLY
    // -------------------------------------------------------
    if (!imageFile && !videoFile) {
      const url = `https://graph.facebook.com/v17.0/${myPageId}/feed`;

      const response = await axios.post(url, {
        message: content,
        access_token: mypageToken
      });

      return res.status(200).json({
        message: "Text-only post shared successfully!",
        facebookResponse: response.data
      });
    }

    // -------------------------------------------------------
    // CASE 2: IMAGE
    // -------------------------------------------------------
    if (imageFile) {
      const formData = new FormData();
      formData.append("source", fs.createReadStream(imageFile.path));
      formData.append("caption", content);

      const photoUrl = `https://graph.facebook.com/v17.0/${myPageId}/photos?access_token=${mypageToken}`;

      const response = await axios.post(photoUrl, formData, {
        headers: formData.getHeaders()
      });

      fs.unlinkSync(imageFile.path);

      return res.status(200).json({
        message: "Image + text post shared successfully!",
        facebookResponse: response.data
      });
    }

    // -------------------------------------------------------
    // CASE 3: VIDEO
    // -------------------------------------------------------
    if (videoFile) {
      const formData = new FormData();
      formData.append("source", fs.createReadStream(videoFile.path));
      formData.append("description", content);

      const videoUrl = `https://graph.facebook.com/v17.0/${myPageId}/videos?access_token=${mypageToken}`;

      const response = await axios.post(videoUrl, formData, {
        headers: formData.getHeaders()
      });

      fs.unlinkSync(videoFile.path);

      return res.status(200).json({
        message: "Video + text post shared successfully!",
        facebookResponse: response.data
      });
    }

    res.status(400).json({ error: "Unsupported file type" });

  } catch (err) {
    console.error(err.response?.data || err);
    return res.status(500).json({
      error: "Server error",
      details: err.response?.data || err.message
    });
  }
};





exports.PostInstagram = async (req, res) => {
  try {
    const { igUserId, pageAccessToken, caption } = req.body;
    const imageFile = req.files?.imageFile?.[0];
    const videoFile = req.files?.videoFile?.[0];

    console.log("IG:", igUserId, "Caption:", caption);

    if (!igUserId || !pageAccessToken || !caption || (!imageFile && !videoFile)) {
      return res.status(400).json({
        success: false,
        message: "igUserId, pageAccessToken, caption and media file are required",
      });
    }

    const file = imageFile || videoFile;
    const isVideo = Boolean(videoFile);

    /* ---------- Upload to Cloudinary ---------- */
    const cloudRes = await cloudinary.uploader.upload(file.path, {
      folder: "instagramPosts",
      resource_type: isVideo ? "video" : "image",
    });

    const mediaUrl = cloudRes.secure_url;
    fs.unlinkSync(file.path);

    /* ---------- Create Media Container ---------- */
    let mediaResponse;

    if (isVideo) {
      mediaResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          media_type: "REELS",
          video_url: mediaUrl,
          caption,
          is_carousel_item: false,
          access_token: pageAccessToken,
        }
      );
    } else {
      mediaResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          image_url: mediaUrl,
          caption,
          access_token: pageAccessToken,
        }
      );
    }

    const creationId = mediaResponse?.data?.id;
    if (!creationId) {
      throw new Error("Failed to create Instagram media container");
    }

    /* ---------- Video Processing Check ---------- */
    if (isVideo) {
      let status = "IN_PROGRESS";
      let attempts = 0;
      const MAX_ATTEMPTS = isVideo ?  12 : 3; // ~1 minute

      while (status === "IN_PROGRESS" && attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, isVideo ? 5000:2000));
        attempts++;

        const statusRes = await axios.get(
          `https://graph.facebook.com/v19.0/${creationId}`,
          {
            params: {
              fields: "status_code",
              access_token: pageAccessToken,
            },
          }
        );

        status = statusRes.data.status_code;
        console.log("Video status:", status);

        if (status === "ERROR") {
          throw new Error("Instagram failed to process the video");
        }
      }

      if (status !== "FINISHED") {
        throw new Error("Instagram video processing timeout");
      }
    }

    /* ---------- Publish Media ---------- */
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: pageAccessToken,
      }
    );

    return res.json({
      success: true,
      postId: publishResponse.data.id,
      message: `Successfully posted ${isVideo ? "video" : "image"}!`,
    });

  } catch (error) {
    console.error(
      "Instagram Post Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};
