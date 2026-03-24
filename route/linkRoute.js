const express = require("express");
const { linkedInWork } = require("../control/linked");
const mylinkRouter = express.Router();


mylinkRouter.get("/callback", linkedInWork);

module.exports = mylinkRouter;
