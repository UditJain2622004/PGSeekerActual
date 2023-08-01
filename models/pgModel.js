import slugify from "slugify";
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
      lowercase: true,
      enum: {
        values: ["male", "female", "coliving"],
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

    amenities: {
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

    rules: {
      smoking: { type: Boolean, default: false },
      // pets: { type: Boolean, default: false },
      guests: { type: Boolean, default: false },
      loudMusic: { type: Boolean, default: false },
      alcohol: { type: Boolean, default: false },
      // hasSecurityDeposit: { type: Boolean, default: false },
      // hasNoticePeriod: { type: Boolean, default: false },
      // hasGateClosingTimes: { type: Boolean, default: false },
      // add more rules as needed
    },

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
      // minLength: [5, "Invalid Gate Closing Time"],
      // maxLength: [5, "Invalid Gate Closing Time"],
    },
    updated: {
      type: Date,
    },

    minPrice: { type: Number },
    maxPrice: { type: Number },

    images: {
      type: [
        {
          // url: String,
          publicId: String,
          version: Number,
        },
      ],
      // required:true,
      // validate: {
      //   validator: function (array) {
      //     return array.length >= 1;
      //   },
      //   message: "Please provide at least one image.",
      // },
      // required: [true, "Please provide at least one image."],
    },
    coverImage: {
      type: {
        // url: String,
        publicId: String,
        version: Number,
      },
      // required: [true, "Please provide a cover image."],
    },

    location: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
        // set(val) {
        //   return this.location.coordinates ? "Point" : "";
        // },
      },
      //[longitude,latitude]
      coordinates: {
        type: [Number],
        // required: true,
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

    //done above this

    ratingsAverage: {
      type: Number,
      default: 0,
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

// works only when called .save() explictly. or maybe with .create() also. DOES NOT work for findOneAnd... functions.
pgSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// if location is not given, coordinates will be undefined but the "type" field will set to "Point" bcz of default value
// which will give error if tr to save without coordinates. So we clear the locationn field completely.
// pgSchema.pre("validate", function (next) {
//   if (!this.location.coordinates) {
//     console.log("Hlo");
//     this.location = undefined;
//   }
//   next();
// });
// pgSchema.pre("save", function (next) {
//   console.log("Hlo");
//   if (!this.location.coordinates) {
//     this.location = undefined;
//   }
//   next();
// });

// sets "type" subfield of location field according to presence of "coordinates"
pgSchema.path("location.type").set(function (val) {
  if (this.location.coordinates && this.location.coordinates.length === 2) {
    return "Point";
  } else {
    return undefined;
  }
});

// to update minprice, maxprice on updating sharing field
pgSchema.pre(/^findOneAndUpdate/, function (next) {
  // "this" refers to the query object
  // so we check if the sharing field is present in the "_update" field of query
  if (this._update.sharing) {
    const sharingPrices = this._update.sharing.map((option) => option.price);
    console.log(sharingPrices);
    // the "_update" field is the field containing updates to doc. So we add minPrice and maxPrice updates to this field
    this._update.minPrice = Math.min(...sharingPrices);
    this._update.maxPrice = Math.max(...sharingPrices);
  }

  // if name is updated , update the slug also
  if (this._update.name) {
    this._update.slug = slugify(this._update.name, { lower: true });
  }

  // console.log(this);
  next();
});

pgSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "pg",
  localField: "_id", //? "localField" contains how the "pg" field of "review" model is called in this model
});

pgSchema.pre(/^find/, function (next) {
  this.populate({
    path: "owner",
    select: "name email -_id",
  });
  next();
});

// Define the indexes for the PG schema
pgSchema.index({ location: "2dsphere" });

const Pg = mongoose.model("Pg", pgSchema);

export default Pg;
