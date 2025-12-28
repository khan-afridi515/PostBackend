const { getPagePost, PostInstagram } = require("../control/controler");
const express = require('express');
const router = express.Router();
const upload = require('../multer');





router.post(
    "/pagePost",
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 }
    ]),
    getPagePost
  );



  router.post(
  "/instagramPost",
  upload.fields([
    { name: "imageFile", maxCount: 1 },
    { name: "videoFile", maxCount: 1 },
  ]),
  PostInstagram
);
  

module.exports = router;