import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";

// const pug = require("pug");

import pgRouter from "./routes/pgRouter.js";
import globalErrorHandler from "./controllers/errorController.js";
// const pgRouter = require("./routes/pgrouter");
// const reviewRouter = require("./routes/reviewRouter");
// const userRouter = require("./routes/userRouter");
// const globalErrorHandler = require("./controllers/errorController.js");

const app = express();

// app.set("view engine", "pug");
// app.set("views", path.join(__dirname, "views"));
// app.use(express.static(path.join(__dirname, "public")));

// MIDDLEWARES
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json({ limit: "100kb" }));
app.use("/api/v1/pg", pgRouter);
// app.use("/api/v1/review", reviewRouter);
// app.use("/api/v1/user", userRouter);

app.use(globalErrorHandler);

export default app;
