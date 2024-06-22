import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const PORT = process.env.PORT || 3000
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({
    limit: "25kb",
}))

app.use(express.urlencoded({ extended: true, limit: "20kb" }));

app.use(express.static("public"));

app.use(cookieParser())


export { app } 