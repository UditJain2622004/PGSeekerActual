import { nanoid } from "nanoid/async";

const modifySearchedPgs = (pgs, filters, next) => {
  try {
    const modifiedPgs = [];
    pgs.forEach((pg) => {
      // reordering amenities with amenities ,that user filtered for, comes first
      if (filters.amenities) {
        // filters amenity names whose value is true
        const availableAmenities = Object.keys(pg.amenities).filter(
          (el) => pg.amenities[el]
        );
        // console.log(availableAmenities);

        // first add the amenities that user filtered for
        const modifiedAmenities = [...filters.amenities];

        // add remaining amenities for the pg
        availableAmenities.forEach((el) => {
          if (!modifiedAmenities.includes(el)) modifiedAmenities.push(el);
        });
        pg.amenities = modifiedAmenities;
        // console.log(availableAmenities);
        // console.log(modifiedAmenities);
      }

      // reordering rules with rules ,that user filtered for, comes first
      if (filters.rules) {
        // filters rule names whose value is true
        const availableRules = Object.keys(pg.rules).filter(
          (el) => pg.rules[el]
        );

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

      // reordering sharing options with occupancy ,that user filtered for, comes first
      if (filters.sharing) {
        const modifiedSharing = [];

        // runs for each occupancy value that user filtered for
        filters.sharing.forEach((occupancy) => {
          // first add sharing options where occupancy value is equal to value user filtered for
          pg.sharing.forEach((sharing) => {
            if (sharing.occupancy === occupancy) modifiedSharing.push(sharing);
          });
        });
        console.log(modifiedSharing);

        // then add remaining sharing options available in the pg
        pg.sharing.forEach((el) => {
          if (!modifiedSharing.includes(el)) modifiedSharing.push(el);
        });
        pg.sharing = modifiedSharing;
        console.log(modifiedSharing);
      }
      //   console.log(pg);
      modifiedPgs.push(pg);
    });
    // modifiedPgs.forEach((el) => console.log(el.sharing));
    // console.log(modifiedPgs);
  } catch (err) {
    console.log(err);
  }
};

// modifySearchedPgs(
//   [
//     {
//       name: "Hlo",
//       sharing: [
//         {
//           occupancy: 1,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 2,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 2,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 3,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 3,
//           price: 10000,
//           ac: true,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//       ],

//       amenities: {
//         lift: true,
//         cctv: true,
//         wifi: false,
//         ac: false,
//         tv: true,

//         powerBackup: false,
//         library: true,
//       },
//       rules: {
//         guests: true,
//         smoking: true,
//         loudMusicAllowed: true,
//         alcoholAllowed: false,
//       },
//     },
//     {
//       sharing: [
//         {
//           occupancy: 1,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 3,
//           price: 10000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 2,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 2,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 3,
//           price: 8000,
//           ac: false,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//         {
//           occupancy: 3,
//           price: 10000,
//           ac: true,
//           _id: "64bd6f8a89ec4e5a16b2de8a",
//         },
//       ],

//       amenities: {
//         lift: true,
//         cctv: true,
//         wifi: true,
//         ac: true,
//         tv: true,

//         powerBackup: false,
//         library: true,
//       },
//       rules: {
//         guests: true,
//         smoking: true,
//         loudMusicAllowed: true,
//         alcoholAllowed: true,
//       },
//     },
//   ],
//   {
//     amenities: ["tv", "library"],
//     rules: ["guests", "loudMusicAllowed"],
//     sharing: [2, 4],
//   },
//   1
// );

const createSeoFriendlyPublicId = (fileName) => {
  // Remove file extension (e.g., .jpg, .png) from the original filename
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

  // Replace spaces and special characters with hyphens to create a clean URL
  const seoFriendlyName = nameWithoutExtension
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  // Append a unique identifier (UUID) to ensure uniqueness
  const uniqueId = Math.random().toString(36).substr(2, 9);
  return `images/${seoFriendlyName}-${uniqueId}`;
};

// console.log(createSeoFriendlyPublicId("abc%^*adkjabdhs.jpg"));

console.log(await nanoid(15));
