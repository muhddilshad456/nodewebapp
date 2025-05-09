const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

// order page
const orderPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const sort = req.query.sort || "newest";
    const page = parseInt(req.query.page) || 1;

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
    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId }).populate(
      "orderedItems.productId"
    );
    res.render("orderDetailes", {
      order,
    });
  } catch (error) {
    console.log("error from order detailes page", error);
  }
};

// updating order status

const orderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }
    const result = await Order.updateOne({ _id: orderId }, { status });
    if (result.modifiedCount === 1) {
      return res.json({
        success: true,
        message: "Status updated successfully",
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or no change made" });
    }
  } catch (error) {
    console.log("error from order status updating ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// confirm return
const confirmReturn = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "order not found" });
    }

    result = await Order.updateOne({ _id: orderId }, { status: "Returned" });

    for (const item of order.orderedItems) {
      const product = await Product.findOne({ _id: item.productId });
      if (!product) {
        console.warn(`Product with ID ${item.productId} not found.`);
        continue;
      }
      product.stockCount += item.quantity;
      await product.save();
    }

    if (result.modifiedCount === 1) {
      return res.json({
        success: true,
        message: "Status updated successfully",
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or no change made" });
    }
  } catch (error) {
    console.error("error from confirming return ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  orderPage,
  orderDetailesPage,
  orderStatus,
  confirmReturn,
};
