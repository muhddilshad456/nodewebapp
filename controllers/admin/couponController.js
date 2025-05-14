const couponPage = async (req, res) => {
  try {
    res.render("coupon");
  } catch (error) {
    console.log("error from coupon page render", error);
  }
};

module.exports = {
  couponPage,
};
