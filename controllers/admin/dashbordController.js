const Order = require("../../models/orderSchema");

const dashbordPage = async (req, res) => {
  try {
    const filterData = req.query.filter || "all";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const today = new Date();
    let fromDate, toDate;

    let filter = { status: "Delivered" };

    if (filterData && filterData !== "all") {
      if (filterData === "today") {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: fromDate, $lte: toDate };
      } else if (filterData === "week") {
        const dayOfWeek = today.getDay();
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

    const orders = await Order.find(filter)
      .populate("userId")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    const graph = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } },
          totalRevenue: { $sum: "$finalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topSellingProducts = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: { path: "$orderedItems", preserveNullAndEmptyArrays: true } },
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
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ]);

    const topSellingCategories = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: { path: "$orderedItems", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$product.category",
          preserveNullAndEmptyArrays: true,
        },
      },
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
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    const topSellingBrands = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: { path: "$orderedItems", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$product.brand", preserveNullAndEmptyArrays: true } },
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
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    res.render("dashbord", {
      orders,
      totalPages,
      currentPage: page,
      filter: filterData,
      topSellingProducts,
      topSellingCategories,
      topSellingBrands,
      graph,
    });
  } catch (error) {
    console.log("error from dashbord page", error);
  }
};

module.exports = {
  dashbordPage,
};
