const express = require('express');
const { signIn, signUp, deletAll } = require('../control/signIn');
const myRouter = express.Router();



myRouter.post ("/signUp", signUp);
myRouter.post ("/signIn", signIn);
myRouter.delete ("/delete", deletAll);




module.exports = myRouter;