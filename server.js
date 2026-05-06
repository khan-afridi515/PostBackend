const express = require('express');
const app = express();
const cors = require('cors');
const router = require('./route/router');
const connectDB = require('./db');
const mylinkRouter = require('./route/linkRoute');
const myRouter = require('./route/myRoute');


app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// app.use(cors());



app.use(
  cors({
    origin: "http://localhost:5173", // ✅ your frontend URL
    credentials: true, // ✅ allow cookies
  })
);

app.use('/app/facebook', router);
app.use('/api/linkedIn', mylinkRouter);
app.use('/api/youtube', myRouter);


app.listen(3003, () =>{
    connectDB();
    console.log('Server is running on port 3003 http://localhost:3003/app/facebook/pagePost');
})

//http://localhost:3003/api/youtube/allActivities