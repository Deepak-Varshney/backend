// require('dotenv').config({path: './env'})  // this can be used but we use import
import dotenv from "dotenv"
import express from "express";
import connectDB from "./db/dbconnect.js"
dotenv.config({
    path:"./env"
})


connectDB();



// const app = express();
// ;(async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error", (error)=>{
//             console.log("Error occured",error);
//             throw error
//         })


//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listing on Port: ${process.env.PORT}`);
//         })

//     } catch (error) {
//         console.error("ERROR", error);
//         throw error
//     }
// })()