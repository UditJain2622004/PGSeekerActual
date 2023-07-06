import express from "express";
import * as pgController from "./../controllers/pgController.js";

const router = express.Router();

router.route("/pgTest").post(pgController.createPgWithJSON);

export default router;
