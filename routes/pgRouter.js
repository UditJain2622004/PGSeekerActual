import express from "express";
import * as pgController from "./../controllers/pgController.js";
import * as authController from "./../controllers/authController.js";
import * as imageController from "./../controllers/imageController.js";

const router = express.Router();

router.route("/pgTest").post(pgController.createPgWithJSON);

router
  .route("/")
  .post(
    // authcontroller.protect,
    // authcontroller.restrictTo("pgOwner", "admin"),
    // pgController.upload.array("images", 50),
    imageController.uploadImagesLocal,
    pgController.createPgDoc,
    imageController.uploadPics,
    pgController.createPg
  )
  .get(authController.protect, pgController.searchPg);

router
  .route("/:id")
  .get(pgController.getPgById)
  .patch(
    authController.protect,
    // authController.restrictTo("pgOwner", "admin"),
    imageController.uploadImagesLocal,
    pgController.updatePgById
  )
  .delete(
    // authController.protect,
    // authController.restrictTo("pgOwner", "admin"),
    pgController.deletePgById
  );

router.route("/search").post(pgController.searchPg);

router.route("/upload").post(
  // imageController.upload.array("images", 50),
  imageController.uploadImagesLocal,
  imageController.uploadPics,
  imageController.sendResponse
);

router.route("/deleteImage").post(imageController.deleteImages);

export default router;
