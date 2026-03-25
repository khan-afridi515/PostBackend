const express = require('express');
const { signIn, signUp, deletAll, myactivities } = require('../control/signIn');
const { connectYoutube, youtubeCallback, getChannels, uploadVideo, deleteAllChannels } = require('../control/youtube');
const upload = require('../multer');


const myRouter = express.Router();


myRouter.get("/connectedYoutube", connectYoutube);
myRouter.get("/callback", youtubeCallback);
myRouter.get("/gettingChannel", getChannels);
myRouter.post("/shareVideo", upload.fields([
    { name: "video", maxCount: 1 }
  ]),  uploadVideo);

myRouter.delete("/deletDb", deleteAllChannels);
myRouter.post ("/signUp", signUp);
myRouter.post ("/signIn", signIn);
myRouter.delete ("/delete", deletAll);
myRouter.get("/allActivities", myactivities);




module.exports = myRouter;