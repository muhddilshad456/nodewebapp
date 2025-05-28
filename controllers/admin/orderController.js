const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");

// order page
const orderPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;

    const limit = 6;

    const orderData = await Order.find({
      orderId: { $regex: ".*" + search + ".*", $options: "i" },
    })
      .sort({ createdOn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("address")
      .populate("orderedItems.productId")
      .exec();

    const count = await Order.countDocuments({
      orderId: { $regex: ".*" + search + ".*", $options: "i" },
    });

    const totalPages = Math.ceil(count / limit);

    res.render("order", {
      order: orderData,
      currentPage: page,
      totalPages,
      search,
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "order not found" });
    }
    if (order.status === "Cancelled" || order.status === "Returned") {
      return res
        .status(404)
        .json({ success: false, message: "Cant update order status" });
    }
    order.status = status;
    for (const item of order.orderedItems) {
      if (item.status !== "Cancelled") {
        item.status = status;
      }
    }
    await order.save();
    res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.log("error from order status updating ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// confirm return
const confirmReturn = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "order not found" });
    }

    order.status = "Returned";

    for (const item of order.orderedItems) {
      const product = await Product.findOne({ _id: item.productId });
      if (!product) {
        console.warn(`Product with ID ${item.productId} not found.`);
        continue;
      }
      if (item.status !== "Returned" && item.status !== "Cancelled") {
        product.stockCount += item.quantity;
        await product.save();
      }
    }

    const wallet = await Wallet.findOne({ userId });

    if (
      order.orderedItems.every(
        (item) => item.status !== "Returned" && item.status !== "Cancelled"
      )
    ) {
      if (!wallet) {
        const newWallet = new Wallet({
          userId,
          balance: order.finalAmount,
          transactions: [
            {
              amount: order.finalAmount,
              type: "Credit",
              method: "Refund",
              status: "Completed",
              orderId: order._id,
            },
          ],
        });
        await newWallet.save();
      } else {
        wallet.balance += order.finalAmount;
        wallet.transactions.push({
          amount: order.finalAmount,
          type: "Credit",
          method: "Refund",
          status: "Completed",
          orderId: order._id,
        });
        await wallet.save();
      }
    } else {
      const orderedItemsTotalPrice = order.orderedItems.reduce((acc, cur) => {
        if (cur.status !== "Cancelled" && cur.status !== "Returned") {
          return acc + (Number(cur.totalOfferPrice) || 0);
        } else {
          return acc;
        }
      }, 0);

      if (!wallet) {
        const newWallet = new Wallet({
          userId,
          balance: orderedItemsTotalPrice,
          transactions: [
            {
              amount: orderedItemsTotalPrice,
              type: "Credit",
              method: "Refund",
              status: "Completed",
              orderId: order._id,
            },
          ],
        });
        await newWallet.save();
      } else {
        wallet.balance += orderedItemsTotalPrice;
        wallet.transactions.push({
          amount: orderedItemsTotalPrice,
          type: "Credit",
          method: "Refund",
          status: "Completed",
          orderId: order._id,
        });
        await wallet.save();
      }
    }

    for (const item of order.orderedItems) {
      if (item.status !== "Returned") {
        item.status = "Returned";
      }
    }

    await order.save();

    res.json({ success: true, message: "Return successfull" });
  } catch (error) {
    console.error("error from confirming return ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// accept single item return
const acceptSingleItemReturn = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }
    const { itemId, orderId } = req.body;
    if (!itemId || !orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing itemId or orderId" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    const item = order.orderedItems.find((i) => i._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in order" });
    }
    const product = await Product.findById(item.productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "product not found" });
    }

    const wallet = await Wallet.findOne({ userId });

    item.status = "Returned";
    if (order.orderedItems.every((item) => item.status === "Returned")) {
      order.status = "Returned";
    }
    await order.save();

    if (!wallet) {
      const newWallet = new Wallet({
        userId,
        balance: item.totalOfferPrice,
        transactions: [
          {
            amount: item.totalOfferPrice,
            type: "Credit",
            method: "Refund",
            status: "Completed",
            orderId: order._id,
          },
        ],
      });
      await newWallet.save();
    } else {
      wallet.balance += item.totalOfferPrice;
      wallet.transactions.push({
        amount: item.totalOfferPrice,
        type: "Credit",
        method: "Refund",
        status: "Completed",
        orderId: order._id,
      });
      await wallet.save();
    }
    product.stockCount += item.quantity;
    await product.save();
    res.json({ success: true, message: "Order returned successfully" });
  } catch (error) {
    console.log("error from acceptSingleItemReturn", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  orderPage,
  orderDetailesPage,
  orderStatus,
  confirmReturn,
  acceptSingleItemReturn,
};
