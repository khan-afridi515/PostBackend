const express = require('express');
const app = express();
const cors = require('cors');
const router = require('./route/router');




app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(cors());
app.use('/app/facebook', router);


app.listen(3001, () =>{
    console.log('Server is running on port 3001 http://localhost:3001/app/facebook/pagePost');
})