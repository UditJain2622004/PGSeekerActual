import fs from "fs";
import multer, { memoryStorage } from "multer";
import cloudinary from "cloudinary";
import AppError from "../utils/appError.js";
import { fileTypeFromFile } from "file-type";
import { nanoid } from "nanoid/async";

//
// we have 2 fields - images and coverImage
// IMAGES SHOULD COME FROM THESE 2 FIELDS ONLY. OTHERWISE IT THROWS ERROR
// coverImage is 1 image and images is an array of images
// to check for error in uploading images -
// for "images" , if any image is not uploaded for some reason, the response will contain an "errors" field with file
// name of images not uploaded
// for "coverImage", if "coverImage" field does not exist in the response , it means the coverImage was not uploaded

// ***************************************************************************

// ------------------------------------ LOCAL UPLOAD ------------------------------------------------------------------

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Append the unique identifier to the original filename
    const fileName = uniqueSuffix + "-&" + file.originalname;
    if (!req.filenames) req.filenames = [];
    req.filenames.push(fileName);

    cb(null, fileName);
    // cb(null, file.originalname);
  },
});

const multerFilter = async (req, file, callback) => {
  // console.log(file);
  //   const type = await fileTypeFromFile("Unicorn.png");

  if (file.mimetype.startsWith("image")) {
    //   // (DOES NOT WORK) Skip the file if the fieldname doesn't match "images" or "coverImage"
    // if (!["images", "coverImage"].includes(file.fieldname)) {
    //   console.log("yes");
    //   return callback(null, false);
    // }
    callback(null, true);
  } else {
    callback(new AppError("Only Images are allowed", 400), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5000000, // 5MB
    // files: 50, // Maximum 50 uploaded files (already done in "uploadImagesLocal")
  },
});

export const uploadImagesLocal = upload.fields([
  // FIELDS FROM WHICH IMAGES COME ARE DEFINED HERE. IF WE ADD NEW FIELD WITH IMAGE, WE HAVE TO ADD IT HERE TOO
  { name: "coverImage", maxCount: 1 },
  { name: "images", maxCount: 50 },
]);

//
//
//
//
//
// -------------------------- UPLOAD TO CLOUDINARY ---------------------------------------------------------

export const uploadPics = async (req, res, next) => {
  try {
    if (!req.files) return next();
    // if (!req.files.coverImage)
    //   return next(new AppError("Please provide a cover image"));

    // UPLOAD COVER IMAGES ----------------------------------------------------------------------------------------------------
    if (req.files.coverImage) {
      const coverImagePath = "./uploads/" + req.files.coverImage[0].filename;
      const coverImage = await uploadToCloudinary(coverImagePath, req);
      if (coverImage) {
        // remove the status field and set rest of the result in req.body.coverImage
        delete coverImage.status;
        req.body.coverImage = coverImage;
      }
    }
    // just remove above 5 lines if ever remove the coverImage field & take "imagePaths" variable
    // from req.files.map instead of req.files.images.map

    // UPLOAD REST IMAGES ----------------------------------------------------------------------------------------------------
    if (req.files.images) {
      const imagePaths = req.files.images.map(
        (file) => "./uploads/" + file.filename
      );

      // Perform parallel image uploads with a concurrency of 5
      const results = await parallelImageUploads(imagePaths, req);
      //   console.log(results);
      req.body.images = [];
      req.body.imageErrors = [];
      results.forEach((el) => {
        if (el.status === "success") {
          // remove the status field and set rest of the result in req.body.images
          delete el.status;
          req.body.images.push(el);
        } else if (el.status === "failure")
          req.body.imageErrors.push(el.erroredImage);
      });

      next();
    }
  } catch (err) {
    next(err);
  }
};

// Function to upload an image to Cloudinary
const uploadToCloudinary = async (localFilePath, req) => {
  try {
    // couldn't do it during local upload bcz didn't have access to file yet
    const type = await fileTypeFromFile(localFilePath);
    console.log(type);
    if (!type || !type.mime.startsWith("image")) {
      throw Error("Invalid Image");
    }

    // create custom public id for image
    const publicId = "pg_image_" + (await nanoid(15));
    const myCloud = await cloudinary.v2.uploader.upload(localFilePath, {
      folder: "images",
      public_id: publicId,
      // format: "png",  // convert all images to given format
      eager: [
        {
          // TO RESIZE IMAGES
          //   width: 500,
          //   height: 500,
          //   crop: "fit", // Use 'fit' to maintain aspect ratio and fit entirely within the 500x500 box
          fetch_format: "auto", // Automatically choose the best format (e.g., WebP or JPEG)
          progressive: true, // Use progressive JPEGs for better loading experience (for JPEG images)
          quality: 60,
          //   quality: "auto", // "auto" automatically picks best quality
        },

        //WE CAN DEFINE MULTIPLE EAGER TRANSFORMS TO CREATE MULTIPLE VERSIONS OF SAME IMAGE (MAY BE USEFUL IF WE WANT TO USE DIFFERENT
        // SIZED IMAGES FOR DIFFERENT DEVICES OR DIFFERENT PLACES IN THE WEBSITE)
      ],
      eager_async: true, // Set eager_async to true to make it an eager transformation
    });

    fs.unlinkSync(localFilePath);
    // console.log(myCloud);

    return {
      status: "success",
      // url: myCloud.eager[0].secure_url,
      publicId,
      version: myCloud.version,
    };
  } catch (err) {
    fs.unlinkSync(localFilePath);
    console.log(err);
    return {
      status: "failure",
      error: err.message,
      erroredImage: localFilePath.split("-&")[1], // filename of image which caused error
    };
    // throw err;
  }
};

// Function to perform parallel image uploads with concurrency control
const parallelImageUploads = async (imagePaths, req) => {
  const concurrency = 5; // Number of parallel uploads
  const uploadPromises = [];

  for (let i = 0; i < imagePaths.length; i += concurrency) {
    const slice = imagePaths.slice(i, i + concurrency);
    const slicePromises = slice.map((localFilePath) =>
      uploadToCloudinary(localFilePath, req)
    );
    uploadPromises.push(...slicePromises);
    await Promise.allSettled(slicePromises);
  }

  return Promise.all(uploadPromises);
};

export const sendResponse = (req, res, next) => {
  // console.log(req.body);
  const response = {
    data: { images: req.body.images, coverImage: req.body.coverImage },
  };
  if (req.body.imageErrors && req.body.imageErrors.length > 0)
    response.data.imageErrors = req.body.imageErrors;
  res.json(200).json({
    status: "success",
    response,
  });
};

//
//
//
//

// const uploadToCloudinary = async (localFilePath, req) => {
//   try {
//     console.log(localFilePath);

//     const myCloud = await cloudinary.v2.uploader.upload(localFilePath, {
//       folder: "images",
//       // format: "png",  // convert all images to given format
//       eager: [
//         {
//           // TO RESIZE IMAGES
//           //   width: 500,
//           //   height: 500,
//           //   crop: "fit", // Use 'fit' to maintain aspect ratio and fit entirely within the 500x500 box
//           fetch_format: "auto", // Automatically choose the best format (e.g., WebP or JPEG)
//           progressive: true, // Use progressive JPEGs for better loading experience (for JPEG images)
//           quality: 60,
//           //   quality: "auto", // "auto" automatically picks best quality
//         },
//       ],
//       eager_async: true, // Set eager_async to true to make it an eager transformation
//     });
//     fs.unlinkSync(localFilePath);
//     console.log(myCloud);
//     return {
//       message: "Success",
//       url: myCloud.eager[0].secure_url,
//     };

//     // throw new Error("Error");
//   } catch (err) {
//     fs.unlinkSync(localFilePath);
//     console.log(err);
//     throw err;
//   }
// };

// export const uploadPics = async (req, res, next) => {
//   try {
//     if (req.files) {
//       console.log(req.files);
//       const promises = [];
//       const maxRetries = 3;
//       const retryDelay = 1000;
//       let imageUrlList;

//       for (let i = 0; i < req.files.length; i++) {
//         const localFilePath = "./uploads/" + req.filenames[i];
//         // const localFilePath = "./uploads/" + req.files[i].originalname;
//         promises.push(
//           uploadToCloudinaryWithRetries(
//             localFilePath,
//             req,
//             maxRetries,
//             retryDelay
//           )
//         );
//       }

//       const results = await Promise.all(promises);
//       imageUrlList = results.map((result) => result.url);
//       req.body.images = imageUrlList;
//     }
//     next();
//   } catch (err) {
//     next(err);
//   }
// };

// const uploadToCloudinaryWithRetries = async (
//   localFilePath,
//   req,
//   maxRetries,
//   retryDelay
// ) => {
//   let retries = 0;
//   while (retries < maxRetries) {
//     try {
//       const result = await uploadToCloudinary(localFilePath, req);
//       return result;
//     } catch (err) {
//       retries++;
//       console.error(`Upload attempt ${retries} failed: ${err}`);
//       await wait(retryDelay);
//     }
//   }
//   throw new Error(`Failed to upload Pictures. Please try again!!`);
// };

// const wait = (ms) => {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// };

//           DELETE IMAGE ==========================================================================================================

// export const deleteImage = async (req, res, next) => {
//   const result = await cloudinary.v2.uploader.destroy(
//     "images/" + req.body.publicId,
//     {
//       invalidate: true,
//       resource_type: "image",
//     }
//   );

// };

export const deleteImages = async (publicIds, folder = "images") => {
  try {
    publicIds?.forEach(async (id) => {
      const result = await cloudinary.v2.uploader.destroy(`${folder}/${id}`, {
        invalidate: true,
        resource_type: "image",
      });

      console.log(result);
      return true;
    });
  } catch (err) {
    console.log(err);
    return false;
  }
};
