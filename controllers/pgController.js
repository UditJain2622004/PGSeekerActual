import fs from "fs";
import multer from "multer";
import cloudinary from "cloudinary";

import AppError from "../utils/appError.js";
import PG from "./../models/pgModel.js";

function capitalizeEachWord(sentence) {
  const words = sentence.split(" ");

  const capitalizedWords = words.map((word) => {
    const firstLetter = word.charAt(0).toUpperCase();
    const restLetters = word.slice(1).toLowerCase();
    return firstLetter + restLetters;
  });

  const capitalizedSentence = capitalizedWords.join(" ");

  return capitalizedSentence;
}

export const createPgDocu = async (req, res, next) => {
  try {
    // console.log(req.body);
    const pg = new PG(req.body);
    console.log(pg);
    await pg.validate();
  } catch (err) {
    next(err);
  }
};

export const createPgWithJSON = async (req, res, next) => {
  try {
    let prices = req.body.sharing?.map((el) => {
      // if price not defined for any sharing option we return 0 so that it does not give error when calculating minPrice,maxPrice
      // otherwise it returns undefined which results in error when calculating minPrice,maxPrice using Math.min()
      // so this is just to not let any error happen here bcz it is gonna happen in the schema eventually, which is handled well
      if (!el.price) return 0;
      return el.price;
    });
    if (prices) {
      req.body.minPrice = Math.min(...prices);
    }
    // console.log(prices, req.body.minPrice, req.body.maxPrice);
    const newPg = await PG.create(req.body);

    res.status(200).json({
      status: "success",
      data: {
        Pg: newPg,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ***************************************************************************
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer setup
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    var uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Append the unique identifier to the original filename
    var fileName = uniqueSuffix + "-" + file.originalname;
    if (!req.filenames) req.filenames = [];
    req.filenames.push(fileName);

    cb(null, fileName);
    // cb(null, file.originalname);
  },
});

const multerFilter = (req, file, callback) => {
  console.log(file.mimetype);
  if (file.mimetype.startsWith("image")) {
    callback(null, true);
  } else {
    callback(new AppError("Not an image! Please upload an image", 400), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
});

const uploadToCloudinary = async (localFilePath, req) => {
  try {
    console.log(localFilePath);

    const myCloud = await cloudinary.v2.uploader.upload(localFilePath, {
      folder: "images",
      width: 150,
      crop: "scale",
    });
    fs.unlinkSync(localFilePath);
    return {
      message: "Success",
      url: myCloud.secure_url,
    };

    // throw new Error("Error");
  } catch (err) {
    fs.unlinkSync(localFilePath);
    console.log(err);
    throw err;
  }
};

export const uploadPics = async (req, res, next) => {
  try {
    if (req.files) {
      console.log(req.files);
      const promises = [];
      const maxRetries = 3;
      const retryDelay = 1000;

      for (let i = 0; i < req.files.length; i++) {
        const localFilePath = "./uploads/" + req.filenames[i];
        // const localFilePath = "./uploads/" + req.files[i].originalname;
        promises.push(
          uploadToCloudinaryWithRetries(
            localFilePath,
            req,
            maxRetries,
            retryDelay
          )
        );
      }

      const results = await Promise.all(promises);
      const imageUrlList = results.map((result) => result.url);
      req.body.images = imageUrlList;
    }
    next();
  } catch (err) {
    next();
  }
};

const uploadToCloudinaryWithRetries = async (
  localFilePath,
  req,
  maxRetries,
  retryDelay
) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await uploadToCloudinary(localFilePath, req);
      return result;
    } catch (err) {
      retries++;
      console.error(`Upload attempt ${retries} failed: ${err}`);
      await wait(retryDelay);
    }
  }
  throw new Error(`Failed to upload Pictures. Please try again!!`);
};

const wait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const createPgDoc = async (req, res, next) => {
  try {
    req.body.amenities = JSON.parse(req.body.pgAmenities);
    req.body.sharing = JSON.parse(req.body.sharing);
    req.body.address = JSON.parse(req.body.address);
    req.body.contact = JSON.parse(req.body.pgContactInfo);
    req.body.rules = JSON.parse(req.body.pgRules);
    req.body.noticePeriodDays = req.body.noticePeriodDays * 1;
    req.body.securityDeposit = req.body.securityDeposit * 1;
    req.body.address.pincode = req.body.address.pincode * 1;
    // To capitalize each word
    req.body.name = capitalizeEachWord(req.body.name);
    req.body.address.locality = capitalizeEachWord(req.body.address.locality);

    // console.log(req.body);
    let prices = req.body.sharing?.map((el) => {
      // if price not defined for any sharing option we return 0 so that it does not give error when calculating minPrice,maxPrice
      // otherwise it returns undefined which results in error when calculating minPrice,maxPrice using Math.min()
      // so this is just to not let any error happen here bcz it is gonna happen in the schema eventually, which is handled well
      if (!el.price) return 0;
      return el.price;
    });
    if (prices) {
      req.body.minPrice = Math.min(...prices);
      req.body.maxPrice = Math.max(...prices);
    }
    req.body.owner = req.body.userID;
    // req.body.address.locality = req.body.address.locality.toLowerCase();
    req.body.address.city = req.body.address.city.toLowerCase();
    req.body.address.state = req.body.address.state.toLowerCase();
    // req.body.pgType = req.body.pgType.toLowerCase();
    console.log(req.body);

    // create pg doc. and validate it (not saving it yet, save after successful image upload)
    const newPg = new PG(req.body);
    await newPg.validate();

    // const newPg = await PG.create(req.body);
    // res.status(201).json({
    //   status: "success",
    //   data: {
    //     Pg: newPg,
    //   },
    // });
    next();
  } catch (err) {
    next(err);
  }
};

export const createPg = async (req, res, next) => {
  try {
    const newPg = await PG.create(req.body);

    const response = {
      status: "success",
      data: {
        Pg: newPg,
      },
    };
    if (req.files && !req.body.images) {
      console.log("Images not uploaded");
      response.status = "imageUploadFailed";
    }
    console.log("PG created");
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const getPgById = async (req, res, next) => {
  try {
    const pg = await PG.findById(req.params.id).populate({
      path: "reviews",
      select: "review rating user -pg -_id",
    });
    if (!pg) return next(new AppError("No document found with that id", 404));
    res.status(200).json({
      status: "success",
      data: {
        pg: pg,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePgById = async (req, res, next) => {
  try {
    req.body.updated = Date.now();
    const pg = await PG.findOneAndUpdate(
      { _id: req.params.id, pgOwner: req.user._id },
      req.body,
      {
        runValidators: true,
        new: true,
      }
    );

    if (!pg) return next(new AppError("Invalid Request", 400));

    res.status(200).json({
      status: "success",
      data: {
        pg: pg,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deletePgById = async (req, res, next) => {
  try {
    const pg = await PG.findOneAndDelete({
      _id: req.params.id,
      pgOwner: req.user._id,
    });

    if (!pg) return next(new AppError("Invalid Request", 400));

    res.status(204).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};

export const searchPg = async (req, res, next) => {
  try {
    // console.log(req.body);
    const { city, amenities, rules, pgType, food, sharing, price, sort } =
      req.body;

    const queryObj = {};
    if (city) {
      queryObj["address.city"] = city.toLowerCase();
    }
    // queryObj = {
    //   "address.city": req.body.city.toLowerCase(),
    // };
    //"pgAmenities.wifi": true, "pgAmenities.parking": true }
    if (amenities?.length > 0) {
      amenities.forEach((el) => {
        queryObj[`amenities.${el}`] = true;
      });
    }
    if (rules?.length > 0) {
      rules.forEach((el) => {
        queryObj[`rules.${el}`] = true;
      });
    }

    //{ pgType: { $in: ["male", "female", "mixed"] } }
    if (pgType?.length > 0) {
      queryObj.pgType = { $in: pgType };
    }
    if (food) {
      queryObj.food = { $in: food };
    }
    //{ 'sharing.occupancy': { $in: [2, 3, 4] } }
    if (sharing?.length > 0) {
      const occupancyValues = sharing.map((el) => parseInt(el));
      queryObj["sharing.occupancy"] = { $in: occupancyValues };
    }

    //{$and: [{ minPrice: { $gte: 5000 } }, { maxPrice: { $lte: 7500 } }],
    if (price?.length === 2) {
      const [minPrice, maxPrice] = price.map((el) => parseInt(el));
      queryObj.$or = [
        { minPrice: { $gte: minPrice, $lte: maxPrice } },
        { maxPrice: { $gte: minPrice, $lte: maxPrice } },
      ];
    }

    console.log(req.body);
    console.log(queryObj);

    let query = PG.find(queryObj);

    //SORTING
    query = query.sort({ minPrice: req.body.sort || 1 });
    //PAGINATION
    // const page = req.query.page * 1 || 1;
    // const limit = req.query.limit * 1 || 50;
    // const skip = (page - 1) * limit;
    // query = query.skip(skip).limit(limit);

    let pgs = await query.lean();

    pgs = modifySearchedPgs(pgs, { amenities, rules, sharing }, next);

    res.status(200).json({
      status: "success",
      results: pgs.length,
      data: {
        pgs: pgs,
      },
    });
  } catch (err) {
    next(err);
  }
};

const modifySearchedPgs = (pgs, filters, next) => {
  try {
    console.log(filters);
    const modifiedPgs = [];
    pgs.forEach((pg) => {
      if (pg.amenities) {
        // filters amenity names whose value is true
        const availableAmenities = Object.keys(pg.amenities).filter(
          (el) => pg.amenities[el]
        );

        // reordering amenities with amenities ,that user filtered for, comes first
        if (filters.amenities) {
          // first add the amenities that user filtered for
          const modifiedAmenities = [...filters.amenities];

          // add remaining amenities for the pg
          availableAmenities.forEach((el) => {
            if (!modifiedAmenities.includes(el)) modifiedAmenities.push(el);
          });
          pg.amenities = modifiedAmenities;
        }
        // if no amenities filter applied, simply put availableAmenities
        else {
          pg.amenities = availableAmenities;
        }
      }

      if (pg.rules) {
        // filters rule names whose value is true
        const availableRules = Object.keys(pg.rules).filter(
          (el) => pg.rules[el]
        );

        // reordering rules with rules ,that user filtered for, comes first
        if (filters.rules) {
          // first add the rules that user filteres for
          const modifiedRules = [...filters.rules];

          // add remaining rules for the pg
          availableRules.forEach((el) => {
            if (!modifiedRules.includes(el)) modifiedRules.push(el);
          });
          pg.rules = modifiedRules;
          // console.log(availableRules);
          // console.log(modifiedRules);
        }
        // if no rules filter applied, simply put availableRules
        else {
          console.log(availableRules);
          pg.rules = availableRules;
        }
      }

      // reordering sharing options with occupancy ,that user filtered for, comes first
      if (filters.sharing) {
        let modifiedSharing = [];

        // runs for each occupancy value that user filtered for
        filters.sharing.forEach((occupancy) => {
          // first add sharing options where occupancy value is equal to value user filtered for
          pg.sharing.forEach((sharing) => {
            if (sharing.occupancy === parseInt(occupancy))
              modifiedSharing.push(sharing);
          });
        });

        // then add remaining sharing options available in the pg
        pg.sharing.forEach((el) => {
          if (!modifiedSharing.includes(el)) modifiedSharing.push(el);
        });

        if (filters.amenities.includes("ac")) {
          const withAC = modifiedSharing.filter((el) => el.ac);
          const withoutAC = modifiedSharing.filter((el) => !el.ac);
          modifiedSharing = [...withAC, ...withoutAC];
        }
        pg.sharing = modifiedSharing;
        console.log(modifiedSharing);
      }
      //   console.log(pg);
      modifiedPgs.push(pg);
    });
    // modifiedPgs.forEach((el) => console.log(el.sharing));
    // console.log(modifiedPgs);
    return modifiedPgs;
  } catch (err) {
    next(err);
  }
};
