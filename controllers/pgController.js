import AppError from "../utils/appError.js";
import PG from "./../models/pgModel.js";

export const createPgWithJSON = async (req, res, next) => {
  try {
    let prices = req.body.sharing?.map((el) => {
      // if price not defined for any sharing option we return 0 so that it does not give error when calculating minPrice,maxPrice
      // otherwise it returns undefined which results in error when calculating minPrice,maxPrice using Math.min()
      // the price not given is later handled in the schema validation and custom error msg is sent
      // so this is just to not let any error happen here bcz it is gonna happen in the schema eventually, which is handled well
      if (!el.price) return 0;
      return el.price;
    });
    if (prices) {
      req.body.minPrice = Math.min(...prices);
      req.body.maxPrice = Math.max(...prices);
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
