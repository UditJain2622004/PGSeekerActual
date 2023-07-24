import path, { dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import pug from "pug";
import passport from "passport";

import pgRouter from "./routes/pgRouter.js";
import globalErrorHandler from "./controllers/errorController.js";
import reviewRouter from "./routes/reviewRouter.js";
import userRouter from "./routes/userRouter.js";

// import passport configuration
import "./utils/passport.js";

const app = express();

// __dirname is not available in ES6 module. This is a work around that
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(passport.initialize());

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

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
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/user", userRouter);

app.use(globalErrorHandler);

export default app;
