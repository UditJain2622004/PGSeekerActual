// import slugify from "slugify";
import mongoose from "mongoose";
import validator from "validator";

const pgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please Provide a name for your PG."],
      trim: true,
      maxLength: [60, "Please Give a shorter PG name."],
    },
    slug: String,

    description: {
      type: String,
      required: [true, "Please Provide a description for your PG."],
      trim: true,
    },

    address: {
      locality: {
        type: String,
        required: [true, "Please Specify a Locality."],
        trim: true,
        lowercase: true,
      },
      city: {
        type: String,
        required: [true, "Please Specify a City."],
        trim: true,
        lowercase: true,
      },
      state: {
        type: String,
        required: [true, "Please Specify a State."],
        trim: true,
        lowercase: true,
      },
      pincode: {
        type: String,
        required: [true, "Please Specify a Pincode."],
        match: [/^[1-9][0-9]{5}$/, "Invalid pincode."],
      },
    },

    // sharing: [
    //   {
    //     occupancy: { type: Number, required: true },
    //     price: { type: Number, required: true },
    //     ac: { type: Boolean, default: false },
    //   },
    // ],

    sharing: {
      type: [
        {
          occupancy: {
            type: Number,
            required: [true, "Please specify occupancy value."],
            min: [1, "Occupancy can not be less than 1."],
          },
          price: {
            type: Number,
            required: [true, "Please specify price for all occupancy values."],
            min: [1, "Price can not be 0 or negative."],
          },
          ac: { type: Boolean, default: false },
        },
      ],
      validate: {
        validator: function (array) {
          return array.length >= 1;
        },
        message: "Please specify at least one sharing option.",
      },
      required: true,
    },

    pgType: {
      type: String,
      enum: {
        values: ["male", "female", "coLiving"],
        message: "PG can be of type - 'male', 'female' or 'coLiving' only.",
      },
      required: [true, "Please specify type of your PG."],
    },

    contact: {
      phone: {
        type: String,
        required: [true, "Please provide a contact number."],
        match: [/^\d{10}$/, "Invalid phone number."],
      },
      email: {
        type: String,
        required: [true, "Please provide an email id."],
        validate: [validator.isEmail, "Please provide a valid email."],
      },
    },

    owner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "PG must belong to a User."],
    },

    nearbyPlaces: [
      {
        placeName: {
          type: String,
          trim: true,
          lowercase: true,
          required: [true, "Please provide names for all nearby places."],
        },
        distance: {
          type: Number,
          required: [true, "Please provide distance from all nearby places."],
          min: [1, "Distance can not be 0 or negative."],
        },
      },
    ],

    amenities: [
      {
        wifi: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        laundry: { type: Boolean, default: false },
        cleaning: { type: Boolean, default: false },
        tv: { type: Boolean, default: false },
        fridge: { type: Boolean, default: false },
        tiffin: { type: Boolean, default: false },
        warden: { type: Boolean, default: false },
        microwave: { type: Boolean, default: false },
        lift: { type: Boolean, default: false },
        cctv: { type: Boolean, default: false },
        nonVeg: { type: Boolean, default: false },
        selfCooking: { type: Boolean, default: false },
        attachWashroom: { type: Boolean, default: false },
        wardrobe: { type: Boolean, default: false },
        powerBackup: { type: Boolean, default: false },
        library: { type: Boolean, default: false },
        // add more amenities as needed
      },
    ],
    rules: [
      {
        smoking: { type: Boolean, default: false },
        // pets: { type: Boolean, default: false },
        guests: { type: Boolean, default: false },
        loudMusicAllowed: { type: Boolean, default: false },
        alcoholAllowed: { type: Boolean, default: false },
        // hasSecurityDeposit: { type: Boolean, default: false },
        // hasNoticePeriod: { type: Boolean, default: false },
        // hasGateClosingTimes: { type: Boolean, default: false },
        // add more rules as needed
      },
    ],

    noticePeriodDays: {
      type: Number,
      default: 0,
      min: [0, "Notice Period can not be less than 0."],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, "Security Deposit can not be less than 0."],
    },
    gateClosingTime: {
      type: String,
      trim: true,
      minLength: [5, "Invalid Gate Closing Time"],
      maxLength: [5, "Invalid Gate Closing Time"],
    },
    updated: {
      type: Date,
    },

    minPrice: { type: Number },
    maxPrice: { type: Number },

    images: {
      type: [String],
      // validate: {
      //   validator: function (array) {
      //     return array.length >= 1;
      //   },
      //   message: "Please provide at least one image.",
      // },
      // required: [true, "Please provide at least one image."],
    },

    location: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      //[longitude,latitude]
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (array) => {
            if (array.length !== 2) {
              return false;
            }
            const [longitude, latitude] = array;
            const isValidLongitude = longitude >= -180 && longitude <= 180;
            const isValidLatitude = latitude >= -90 && latitude <= 90;

            return isValidLongitude && isValidLatitude;
          },
          message: "Invalid Coordinates.",
        },
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    food: {
      type: String,
      enum: ["veg", "both"],
      default: "veg",
      // required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // id: false,
  }
);

pgSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

pgSchema.pre("save", function (next) {
  if (!this.location.coordinates) {
    this.location = undefined;
  }
  next();
});

pgSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "pg",
  localField: "_id", //? "localField" contains how the "pg" field of "review" model is called in this model
});

pgSchema.pre(/^find/, function (next) {
  this.populate({
    path: "pgOwner",
    select: "name email -_id",
  });
  next();
});

// Define the indexes for the PG schema
pgSchema.index({ location: "2dsphere" });

const Pg = mongoose.model("Pg", pgSchema);

export default Pg;
