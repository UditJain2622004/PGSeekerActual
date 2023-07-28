export const filterObj = (obj, allowedFields, negative) => {
  const newObj = {};
  if (negative) {
    Object.keys(obj).forEach((el) => {
      if (!allowedFields.includes(el)) {
        newObj[el] = obj[el];
      }
    });
  } else {
    Object.keys(obj).forEach((el) => {
      if (allowedFields.includes(el)) {
        newObj[el] = obj[el];
      }
    });
  }

  return newObj;
};

export const removeFalseValues = (obj) => {
  return Object.keys(obj).filter((el) => obj[el] === true);
};

export const capitalizeEachWord = (sentence) => {
  const words = sentence.split(" ");

  const capitalizedWords = words.map((word) => {
    const firstLetter = word.charAt(0).toUpperCase();
    const restLetters = word.slice(1).toLowerCase();
    return firstLetter + restLetters;
  });

  const capitalizedSentence = capitalizedWords.join(" ");

  return capitalizedSentence;
};
