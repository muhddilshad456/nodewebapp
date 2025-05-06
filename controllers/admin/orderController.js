const Order = require("../../models/orderSchema");

// order page
const orderPage = async (req, res) => {
  try {
    console.log("hihi");
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const sort = req.query.sort || "newest";
    const page = parseInt(req.query.page) || 1;
    console.log("search query", search);
    console.log("filter query", filter);
    console.log("sort query", sort);
    console.log("page query", page);

    let sortOption = {};
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const limit = 3;

    const orderData = await Order.find({
      $or: [
        { orderId: { $regex: ".*" + search + ".*", $options: "i" } },
        { status: filter },
      ],
    })
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("address")
      .populate("orderedItems.productId")
      .exec();

    const count = await Order.find({
      $or: [{ orderId: { $regex: ".*" + search + ".*" } }, { status: filter }],
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render("order", {
      order: orderData,
      sort,
      currentPage: page,
      totalPages,
      search,
      filter,
      count,
    });
  } catch (error) {
    console.log("error from ", error);
  }
};

// order detailes page

const orderDetailesPage = async (req, res) => {
  try {
    res.render("orderDetailes");
  } catch (error) {
    console.log("error from order detailes page", error);
  }
};

module.exports = {
  orderPage,
  orderDetailesPage,
};
