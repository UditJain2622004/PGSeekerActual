import express from "express";
import AppError from "./../utils/appError.js";
import Review from "./../models/reviewModel.js";

export const getAllReviews = async (req, res, next) => {
  try {
    let filter = {};
    if (req.params.pgID) filter = { pg: req.params.pgID };
    const reviews = await Review.find(filter).limit(9);

    // if (!reviews) return next(new AppError("No review found"));

    res.status(200).json({
      status: "success",
      results: reviews.length,
      data: {
        reviews,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    req.body.pg = req.params.pgID;
    // req.body.user = req.user._id;
    const newReview = await Review.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        review: newReview,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review)
      return next(new AppError("No document found with that id", 404));
    res.status(200).json({
      status: "success",
      data: {
        review,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateReviewById = async (req, res, next) => {
  try {
    req.body.updated = Date.now();
    const review = await Review.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.body.user,
        // user: req.user._id,
      },
      req.body,
      { runValidators: true, new: true }
    );

    if (!review) return next(new AppError("Invalid Request", 400));

    res.status(200).json({
      status: "success",
      data: {
        review: review,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReviewById = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.body.user,
      //   user: req.user._id,
    });

    if (!review) return next(new AppError("Invalid Request", 400));

    res.status(204).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};
