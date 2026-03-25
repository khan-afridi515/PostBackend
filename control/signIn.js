const logg = require("../modal/log");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Activity = require('../modal/activity');

dotenv.config();

exports.signUp = async (req, res) => {
    try {
       const {email, password}= req.body
       
        const user = await logg.findOne({email})
         console.log("email come successfully!");
       const myPassword = password;

       const hashpassword = await bcrypt.hash(myPassword, 10);

       const saveData = await logg.create({password:hashpassword, email});

       if(!saveData){
        return res.status(400).json({message : "User not created"});
       }
       return res.status(200).json({message : "User created successfully!"});
    }
    catch (error){
        console.log(error);
    }
}


exports.signIn = async (req, res) => {
    try {
        const {email, password} = req.body;

        const user = await logg.findOne({email});

        

        if(!user){
            return res.status(400).json({message : "Email doesn't matched!"});
        }

        const findUser = await bcrypt.compare(password, user.password);

        if(!findUser){
            return res.status(400).json({message : "Password doesn't matched!"});
        }

        const token = jwt.sign({
            email : user.email,
            password : user.password
        },
       process.env.Token_Code,
       {expiresIn : "1d"}
      )
         return res.status(200).json({message : "Login successfully!", token});
    }
    catch(err){
        console.log(err);
    }

}


exports.deletAll = async(req, res) => {
    try{

        await logg.deleteMany({});

        const findUser = await logg.find();

        return res.status(200).json({message : "All user deleted!", findUser});
    }
    catch(err){
        console.log(err);
    }
}



exports.myactivities = async(req, res) => {
    try {
        const activities = await Activity.find().sort({ createdAt: -1 });
    
        res.json({
          success: true,
          data: activities
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
}