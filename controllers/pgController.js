import fs from "fs";
import multer from "multer";
import cloudinary from "cloudinary";

import AppError from "../utils/appError.js";
import PG from "./../models/pgModel.js";
import { filterObj, removeFalseValues } from "../utils/utils.js";

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
    // req.body.amenities = JSON.parse(req.body.pgAmenities);
    // req.body.sharing = JSON.parse(req.body.sharing);
    // req.body.address = JSON.parse(req.body.address);
    // req.body.contact = JSON.parse(req.body.pgContactInfo);
    // req.body.rules = JSON.parse(req.body.pgRules);
    // req.body.noticePeriodDays = req.body.noticePeriodDays * 1;
    // req.body.securityDeposit = req.body.securityDeposit * 1;
    // req.body.address.pincode = req.body.address.pincode * 1;
    // req.body.name = capitalizeEachWord(req.body.name);
    // req.body.address.locality = capitalizeEachWord(req.body.address.locality);

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
    // req.body.owner = req.body.userID;

    // create pg doc. and validate it (not saving it yet, save after successful image upload)
    const data = filterObj(
      req.body,
      ["updated", "ratingsAverage", "ratingsQuantity"],
      true
    );
    const newPg = new PG(data);
    await newPg.validate();
    req.newPg = newPg;
    next();
  } catch (err) {
    next(err);
  }
};

export const createPg = async (req, res, next) => {
  try {
    const newPg = await req.newPg.save();

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
    // more data, 1 call to Database
    // send all subfields of a field, updated as well as not updated
    // for e.g , if address.locality is updated, we also need to send other subfields of address like city,state,pincode
    req.body.updated = Date.now();
    const updates = filterObj(
      req.body,
      //prettier-ignore
      ["owner","updated","minPrice","maxPrice","ratingsAverage","ratingsQuantity"],
      true
    );

    const pg = await PG.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
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
// export const updatePgById2 = async (req, res, next) => {
//   try {
//     // less data, 2 call to Database
//     // send only updated fields and subfields
//     const updates = filterObj(
//       req.body,
//       //prettier-ignore
//       ["owner","updated","minPrice","maxPrice","ratingsAverage","ratingsQuantity","sharing"],
//       true
//     );

//     const pg = await PG.findOne({ _id: req.params.id, owner: req.user._id });

//     if (!pg) return next(new AppError("Invalid Request", 400));
//     pg.updated = Date.now();

//     if (req.body.sharing) {
//       req.body.sharing.forEach((el) => {
//         pg.sharing.forEach((option) => {
//           if (option.id.toString() === el.id) {
//             option.occupancy = el.occupancy || option.occupancy;
//             option.price = el.price || option.price;
//             option.ac = el.ac ?? option.ac;
//           }
//         });
//         // if (sharingOption) sharingOption = { sharingOption, ...el };
//       });
//     }

//     Object.keys(updates).forEach((field) => {
//       // console.log(pg[field], typeof pg[field]);
//       if (typeof pg[field] === "object") {
//         console.log(pg[field]);
//         console.log(updates[field]);
//         Object.keys(updates[field]).forEach((el) => {
//           console.log(el);
//           pg[field][el] = updates[field][el];
//         });
//         // console.log({ ...pg[field], ...updates[field] });
//         // pg[field] = { ...pg[field], ...updates[field] };
//       } else {
//         pg[field] = updates[field];
//       }
//     });

//     console.log(pg);

//     res.status(200).json({
//       status: "success",
//       data: {
//         pg: pg,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

export const deletePgById = async (req, res, next) => {
  try {
    const pg = await PG.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
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

    if (amenities) {
      Object.keys(amenities).forEach((el) => {
        if (amenities[el]) queryObj[`amenities.${el}`] = true;
      });
    }
    if (rules) {
      Object.keys(rules).forEach((el) => {
        if (rules[el]) queryObj[`rules.${el}`] = true;
      });
    }
    if (pgType) {
      queryObj.pgType = { $in: removeFalseValues(pgType) };
    }
    if (sharing) {
      let sharingValue = removeFalseValues(sharing);
      sharingValue = sharingValue.map((el) => el * 1);
      queryObj["sharing.occupancy"] = { $in: sharingValue };
    }
    // if (amenities?.length > 0) {
    // amenities.forEach((el) => {
    //   queryObj[`amenities.${el}`] = true;
    // });
    // }

    // if (rules?.length > 0) {
    //   rules.forEach((el) => {
    //     queryObj[`rules.${el}`] = true;
    //   });
    // }

    // if (pgType?.length > 0) {
    //   queryObj.pgType = { $in: pgType };
    // }

    // if (sharing?.length > 0) {
    //   const occupancyValues = sharing.map((el) => parseInt(el));
    //   queryObj["sharing.occupancy"] = { $in: occupancyValues };
    // }

    if (food) {
      queryObj.food = { $in: food };
    }

    //{$and: [{ minPrice: { $gte: 5000 } }, { maxPrice: { $lte: 7500 } }],
    if (price?.length === 2) {
      const [minPrice, maxPrice] = price.map((el) => parseInt(el));
      queryObj.$or = [
        { minPrice: { $gte: minPrice, $lte: maxPrice } },
        { maxPrice: { $gte: minPrice, $lte: maxPrice } },
      ];
    }

    console.log(queryObj);

    let query = PG.find(queryObj);

    //SORTING
    query = query.sort({ minPrice: req.body.sort || 1 });
    //PAGINATION
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 20;
    const skip = (page - 1) * limit;
    query = query
      .skip(skip)
      .limit(limit)
      .select("amenities rules sharing -_id");

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

        // reordering amenities with amenities that user filtered for, coming first
        if (filters.amenities) {
          // first add the amenities that user filtered for
          const modifiedAmenities = [...Object.keys(filters.amenities)];

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
          const modifiedRules = [...Object.keys(filters.rules)];

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
          // console.log(availableRules);
          pg.rules = availableRules;
        }
      }

      // reordering sharing options with occupancy ,that user filtered for, comes first
      if (filters.sharing) {
        let modifiedSharing = [];

        // runs for each occupancy value that user filtered for
        Object.keys(filters.sharing).forEach((occupancy) => {
          // first add sharing options where occupancy value is equal to value user filtered for
          pg.sharing.forEach((sharing) => {
            if (sharing.occupancy === parseInt(occupancy))
              if (filters.amenities?.ac && sharing.ac) {
                // if filtered by "ac", put sharing options with ac first
                modifiedSharing.unshift(sharing);
              } else {
                modifiedSharing.push(sharing);
              }
          });
        });

        // then add remaining sharing options available in the pg
        const remainingSharing = [];
        pg.sharing.forEach((sharing) => {
          if (!modifiedSharing.includes(sharing)) {
            // if filtered by "ac", put sharing options with ac first
            if (filters.amenities?.ac && sharing.ac) {
              remainingSharing.unshift(sharing);
            } else {
              remainingSharing.push(sharing);
            }
          }
        });

        // if (filters.amenities?.ac) {
        //   const withAC = modifiedSharing.filter((el) => el.ac);
        //   const withoutAC = modifiedSharing.filter((el) => !el.ac);
        //   modifiedSharing = [...withAC, ...withoutAC];
        // }
        pg.sharing = [...modifiedSharing, ...remainingSharing];
        // console.log(modifiedSharing);
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
