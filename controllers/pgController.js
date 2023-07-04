import PG from "./../models/pgModel.js";

export const createPgWithJSON = async (req, res, next) => {
  try {
    let prices = req.body.sharing.map((el) => el.price);
    req.body.minPrice = Math.min(...prices);
    req.body.maxPrice = Math.max(...prices);
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
