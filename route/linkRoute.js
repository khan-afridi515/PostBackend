const express = require("express");
const {postLinkedInAccount, linkedInCallback, getLinkedInAccounts} = require("../control/linked");
const { verifyToken } = require("../auth");
const multer = require("multer");
const mylinkRouter = express.Router();



const upload = multer({
    storage: multer.memoryStorage(), // ✅ recommended
  });

mylinkRouter.get("/callback", linkedInCallback);
mylinkRouter.post("/postAccount", upload.single("image"), postLinkedInAccount)
mylinkRouter.get("/getData", verifyToken,  getLinkedInAccounts)

module.exports = mylinkRouter;
