const Order = require("../../models/orderSchema");

const salesreportPage = async (req, res) => {
  try {
    console.log("+++===+++", req.query);
    const selectRange = req.query.selectRange;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const page = req.query.page;
    const limit = 6;
    const skip = (page - 1) * limit;

    let filter = {};

    const today = new Date();
    let fromDate, toDate;

    if (startDate && endDate) {
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "today") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisWeek") {
      const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - diffToMonday);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisMonth") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisYear") {
      fromDate = new Date(today.getFullYear(), 0, 1);
      toDate = new Date(today.getFullYear(), 11, 31);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    }

    const orders = await Order.find(filter).sort({ createdOn: -1 });
    //   .skip(skip)
    //   .limit(limit);

    const totalOrders = await Order.find(filter).countDocuments();

    // const totalPages = totalOrders / limit;
    res.render("salesreport", {
      orders,
      //   totalPages,
      //   currentPage: page,
      selectRange,
      startDate,
      endDate,
    });
  } catch (error) {
    console.log("error from salesreportPage", error);
  }
};

module.exports = {
  salesreportPage,
};
