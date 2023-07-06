import mongoose from "mongoose";
import Pg from "./pgModel.js";

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      maxLength: [1000, "Review can not be more than 1000 characters long."],
      // required: [true, "Review can not be empty"],
    },
    rating: {
      type: Number,
      enum: {
        values: [1, 2, 3, 4, 5],
        message: "Rating can only be an integer from 1 to 5.",
      },
    },
    pg: {
      type: mongoose.Schema.ObjectId,
      ref: "Pg",
      required: [true, "Review must belong to a PG."],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a User."],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updated: {
      type: Date,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

reviewSchema.index({ pg: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name",
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (pgId) {
  const stats = await this.aggregate([
    {
      $match: { pg: pgId },
    },
    {
      $group: {
        _id: "$pg",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  if (stats.length > 0) {
    await Pg.findByIdAndUpdate(pgId, {
      //*update data in Pg model
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  }
  console.log(stats);
};

reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.pg);
});

//todo To update review stats on Updating and Deleting reviews
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.model.find(this._conditions);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  console.log(this.r);
  if (this.r.length > 0)
    await this.r[0].constructor.calcAverageRatings(this.r[0].pg);
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
