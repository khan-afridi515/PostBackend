const axios = require("axios");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const LinkedInAccount = require("../modal/linedIn");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const getAccessToken = async (code) => {
  console.log("Getting access token with code:", code);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.LINKED_IN_CLIENT_ID,
    client_secret: process.env.LINKED_IN_CLIENT_SECERT,
    redirect_uri: "http://localhost:3003/api/linkedIn/callback"
  });

  console.log("This is body for access token:", body.toString());
  const { data } = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    body.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  console.log("This is data from access token response;", data);

  return data;
};


const getUserOrganizations = async (accessToken) => {

  console.log("This is access token", accessToken);
  const url =

    "https://api.linkedin.com/v2/organizationalEntityAcls" +
    "?q=roleAssignee&role=ADMINISTRATOR" +
    "&projection=(elements*(organizationalTarget~(id,name,vanityName)))";

  const { data } = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0"
    }
  });

  return data.elements;
};



exports.linkedInCallback = async (req, res) => {
  const { code, state } = req.query;
  try {
    const token = state
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({ error, error_description });
    }

    const decoded = jwt.verify(token, process.env.Token_Code);

    const userId = decoded.id;

    // ✅ Step 1: Exchange code for token
    const tokenData = await getAccessToken(code);

    const accessToken = tokenData.access_token;

    // ✅ Step 2: Get user profile
    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("linkedIn profileRes", profileRes.data);

    const profile = profileRes.data;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }



    let account = await LinkedInAccount.findOne({ userId });

    if (account) {
      // 🔄 UPDATE EXISTING USER
      account.accessToken = accessToken;
      account.expiresIn = tokenData.expires_in;
      account.tokenType = tokenData.token_type || "Bearer";
      account.rawProfile = profile;

      await account.save();
    } else {
      // 🆕 CREATE NEW USER
      account = await LinkedInAccount.create({
        userId,
        accessToken,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type || "Bearer",
        rawProfile: profile,
      });
    }


    // ✅ Optional cookie
    res.cookie("li_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
    });

    // ✅ Redirect (same pattern as YouTube)
    res.redirect(`http://localhost:5173/linked/work?id=${account._id}`);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "LinkedIn auth failed" });
  }
};





exports.getLinkedInAccounts = async (req, res) => {
  try {
    // ✅ get userId from JWT middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // ✅ find LinkedIn account
    const account = await LinkedInAccount.findOne({ userId });

    console.log("my account", account);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "LinkedIn account not connected",
      });
    }

    // ✅ return access token
    return res.status(200).json({
      success: true,
      accessToken: account.accessToken,
      expiresIn: account.expiresIn,
      connected: true,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// exports.postLinkedInAccount = async (req, res) => {
//   try {
//     const { text, author, accessToken } = req.body;
//     const file = req.file;

//     let mediaAsset = null;
//     let mediaCategory = "NONE";

//     // ===============================
//     // 📸 IMAGE / 🎥 VIDEO FLOW
//     // ===============================
//     if (file) {
//       const isVideo = file.mimetype.startsWith("video");
//       mediaCategory = isVideo ? "VIDEO" : "IMAGE";

//       // STEP 1: Register Upload
//       const registerRes = await axios.post(
//         "https://api.linkedin.com/v2/assets?action=registerUpload",
//         {
//           registerUploadRequest: {
//             owner: author,
//             recipes: [
//               isVideo
//                 ? "urn:li:digitalmediaRecipe:feedshare-video"
//                 : "urn:li:digitalmediaRecipe:feedshare-image",
//             ],
//             serviceRelationships: [
//               {
//                 relationshipType: "OWNER",
//                 identifier: "urn:li:userGeneratedContent",
//               },
//             ],
//           },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "X-Restli-Protocol-Version": "2.0.0",
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const uploadUrl =
//         registerRes.data.value.uploadMechanism[
//           "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
//         ].uploadUrl;

//       mediaAsset = registerRes.data.value.asset;

//       // STEP 2: Upload File
//       const fileData = fs.readFileSync(file.path);

//       await axios.put(uploadUrl, fileData, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": file.mimetype,
//         },
//         maxContentLength: Infinity,
//         maxBodyLength: Infinity,
//       });

//       // delete temp file
//       fs.unlinkSync(file.path);
//     }

//     // ===============================
//     // 📝 CREATE POST
//     // ===============================
//     const postBody = {
//       author,
//       lifecycleState: "PUBLISHED",
//       specificContent: {
//         "com.linkedin.ugc.ShareContent": {
//           shareCommentary: { text },
//           shareMediaCategory: mediaCategory,
//         },
//       },
//       visibility: {
//         "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
//       },
//     };

//     // attach media if exists
//     if (mediaAsset) {
//       postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
//         {
//           status: "READY",
//           media: mediaAsset,
//         },
//       ];
//     }

//     const postRes = await axios.post(
//       "https://api.linkedin.com/v2/ugcPosts",
//       postBody,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "X-Restli-Protocol-Version": "2.0.0",
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return res.json({
//       success: true,
//       message: "Posted successfully 🚀",
//       data: postRes.data,
//     });
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     return res.status(500).json({
//       success: false,
//       error: error.response?.data || error.message,
//     });
//   }

// }




// exports.postLinkedInAccount = async (req, res) => {
//   try {
//     const { text, accessToken } = req.body;
//     const file = req.file;

//     // ✅ Validation
//     if (!text || !accessToken) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     let mediaAsset = null;
//     let mediaCategory = "NONE";

//     // ===============================
//     // 📸 IMAGE / 🎥 VIDEO FLOW
//     // ===============================
//     if (file) {
//       const isVideo = file.mimetype.startsWith("video");
//       mediaCategory = isVideo ? "VIDEO" : "IMAGE";

//       // ===============================
//       // 📡 STEP 1: Register Upload
//       // ===============================
//       const registerRes = await axios.post(
//         "https://api.linkedin.com/v2/assets?action=registerUpload",
//         {
//           registerUploadRequest: {
//             owner: author,
//             recipes: [
//               isVideo
//                 ? "urn:li:digitalmediaRecipe:feedshare-video"
//                 : "urn:li:digitalmediaRecipe:feedshare-image",
//             ],
//             serviceRelationships: [
//               {
//                 relationshipType: "OWNER",
//                 identifier: "urn:li:userGeneratedContent",
//               },
//             ],
//           },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "X-Restli-Protocol-Version": "2.0.0",
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const uploadUrl =
//         registerRes.data.value.uploadMechanism[
//           "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
//         ].uploadUrl;

//       mediaAsset = registerRes.data.value.asset;

//       // ===============================
//       // 🚀 STEP 2: Upload File (buffer)
//       // ===============================
//       await axios.put(uploadUrl, file.buffer, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": file.mimetype,
//         },
//         maxContentLength: Infinity,
//         maxBodyLength: Infinity,
//       });
//     }

//     // ===============================
//     // 📝 CREATE POST
//     // ===============================
//     const postBody = {
//       author,
//       lifecycleState: "PUBLISHED",
//       specificContent: {
//         "com.linkedin.ugc.ShareContent": {
//           shareCommentary: { text },
//           shareMediaCategory: mediaCategory,
//         },
//       },
//       visibility: {
//         "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
//       },
//     };

//     // attach media if exists
//     if (mediaAsset) {
//       postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
//         {
//           status: "READY",
//           media: mediaAsset,
//         },
//       ];
//     }

//     const postRes = await axios.post(
//       "https://api.linkedin.com/v2/ugcPosts",
//       postBody,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "X-Restli-Protocol-Version": "2.0.0",
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return res.json({
//       success: true,
//       message: "Posted successfully 🚀",
//       data: postRes.data,
//     });

//   } catch (error) {
//     console.error("LinkedIn Error:", error.response?.data || error.message);

//     return res.status(500).json({
//       success: false,
//       error: error.response?.data || error.message,
//     });
//   }
// };
// ===============================




exports.postLinkedInAccount = async (req, res) => {
  try {
    const { text, accessToken } = req.body;
    const file = req.file;

    // ✅ Validation
    if (!text || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ===============================
    // 👤 STEP 0: Get AUTHOR from LinkedIn
    // ===============================
    const meRes = await axios.get("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const author = `urn:li:person:${meRes.data.id}`;

    let mediaAsset = null;
    let mediaCategory = "NONE";

    // ===============================
    // 📸 IMAGE / 🎥 VIDEO FLOW
    // ===============================
    if (file) {
      const isVideo = file.mimetype.startsWith("video");
      mediaCategory = isVideo ? "VIDEO" : "IMAGE";

      // ===============================
      // 📡 STEP 1: Register Upload
      // ===============================
      const registerRes = await axios.post(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          registerUploadRequest: {
            owner: author,
            recipes: [
              isVideo
                ? "urn:li:digitalmediaRecipe:feedshare-video"
                : "urn:li:digitalmediaRecipe:feedshare-image",
            ],
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
          },
        }
      );

      const uploadUrl =
        registerRes.data.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].uploadUrl;

      mediaAsset = registerRes.data.value.asset;

      // ===============================
      // 🚀 STEP 2: Upload File
      // ===============================
      await axios.put(uploadUrl, file.buffer, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.mimetype,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    }

    // ===============================
    // 📝 CREATE POST
    // ===============================
    const postBody = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: mediaCategory,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    // attach media if exists
    if (mediaAsset) {
      postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          media: mediaAsset,
        },
      ];
    }

    // ===============================
    // 🚀 POST TO LINKEDIN
    // ===============================
    const postRes = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      success: true,
      message: "Posted successfully 🚀",
      data: postRes.data,
    });

  } catch (error) {
    console.error("LinkedIn Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};