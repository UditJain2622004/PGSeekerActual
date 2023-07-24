import express from "express";
import * as reviewController from "./../controllers/reviewController.js";
import * as authController from "./../controllers/authController.js";

const router = express.Router({ mergeParams: true });

router
  .route("/pg/:pgID")
  .get(reviewController.getAllReviews)
  .post(authController.protect, reviewController.createReview);

router
  .route("/:id")
  .get(reviewController.getReviewById)
  .delete(
    // authController.protect,
    reviewController.deleteReviewById
  )
  .patch(
    // authController.protect,
    reviewController.updateReviewById
  );

export default router;
