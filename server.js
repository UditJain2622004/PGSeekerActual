import mongoose from "mongoose";
import dotenv from "dotenv";
import cloudinary from "cloudinary";

// For handling errors outside express from synchronous code
// Synchronous code errors emits uncaughtException event , so we can cathc them using that
process.on("uncaughtException", (err) => {
  console.log("Unhandled Exception!! Shutting down...");
  console.log(err.name, err.message);
  console.log(err);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connection established"));

import app from "./app.js";

// cloudinary.config({
//   cloud_name: process.env.ClOUDINARY_NAME,
//   api_key: process.env.ClOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

const server = app.listen(process.env.PORT, () => {
  console.log("Server started on port 5000");
});

// For handling errors outside express from asynchronous code
// aSynchronous code errors emits unhandledRejection event , so we can catch them using that
process.on("unhandledRejection", (err) => {
  console.log("Unhandled rejection!! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM recieved! Shutting down");
  server.close(() => {
    console.log("Process terminated");
  });
});
