// require('dotenv').config({path: './env'})  // this can be used but we use import
import dotenv from "dotenv"
import connectDB from "./db/dbconnect.js"
const PORT = process.env.PORT || 3000
dotenv.config({
    path:"./env"
})


connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`⚙️Server is running at port: ${PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO DB connection failed!!! ", err);
})



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