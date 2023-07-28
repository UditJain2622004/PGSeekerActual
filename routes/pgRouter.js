import express from "express";
import * as pgController from "./../controllers/pgController.js";
import * as authController from "./../controllers/authController.js";

const router = express.Router();

router.route("/pgTest").post(pgController.createPgWithJSON);

router
  .route("/")
  .post(
    // authcontroller.protect,
    // authcontroller.restrictTo("pgOwner", "admin"),
    pgController.upload.array("images", 50),
    pgController.createPgDoc,
    pgController.uploadPics,
    pgController.createPg
  )
  .get(authController.protect, pgController.searchPg);

router
  .route("/:id")
  .get(pgController.getPgById)
  .patch(
    authController.protect,
    // authController.restrictTo("pgOwner", "admin"),
    pgController.updatePgById
  )
  .delete(
    // authController.protect,
    // authController.restrictTo("pgOwner", "admin"),
    pgController.deletePgById
  );

router.route("/search").post(pgController.searchPg);

// router
//   .route("/upload")
//   .post(pgController.upload.array("images", 50), pgController.uploadPics);

export default router;
