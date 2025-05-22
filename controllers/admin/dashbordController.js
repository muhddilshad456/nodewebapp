const Order = require("../../models/orderSchema");

const dashbordPage = async (req, res) => {
  try {
    const filterData = req.query.filter;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const today = new Date();
    let fromDate, toDate;

    let filter = { status: { $ne: "Payment failed" } };

    if (filterData && filterData !== "all") {
      if (filterData === "today") {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: fromDate, $lte: toDate };
      } else if (filterData === "week") {
        const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - diffToMonday);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: fromDate, $lte: toDate };
      } else if (filterData === "month") {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        toDate.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: fromDate, $lte: toDate };
      } else if (filterData === "year") {
        fromDate = new Date(today.getFullYear(), 0, 1);
        toDate = new Date(today.getFullYear(), 11, 31);
        toDate.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: fromDate, $lte: toDate };
      }
    }

    console.log("filtr", filter);

    const orders = await Order.find(filter)
      .populate("userId")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    totalOrders = await Order.countDocuments(filter);
    const totalPages = totalOrders / limit;

    const topSellingProducts = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.productId",
          totalSold: { $sum: "$orderedItems.quantity" },
          totalRevenuw: { $sum: "$orderedItems.totalOfferPrice" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ]);

    const topSellingCategories = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $unwind: "$product.category" },
      {
        $group: {
          _id: "$product.category",
          totalSold: { $sum: "$orderedItems.quantity" },
          totalRevenuw: { $sum: "$orderedItems.totalOfferPrice" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    const topSellingBrands = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $unwind: "$product.brand" },
      {
        $group: {
          _id: "$product.brand",
          totalSold: { $sum: "$orderedItems.quantity" },
          totalRevenuw: { $sum: "$orderedItems.totalOfferPrice" },
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    console.log("top sellig cat", topSellingCategories);
    console.log("top sellig cat", topSellingBrands);
    console.log("top selling product ", topSellingProducts);

    res.render("dashbord", {
      orders,
      totalPages,
      currentPage: page,
      filter: filterData,
      topSellingProducts,
      topSellingCategories,
      topSellingBrands,
    });
  } catch (error) {
    console.log("error from dashbord page", error);
  }
};

module.exports = {
  dashbordPage,
};
