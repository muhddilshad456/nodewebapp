const loadHome = async (req, res) => {
  try {
    return res.render("home");
  } catch (error) {
    console.log("home page render error");
    res.status(500).send("Home page not found");
  }
};

module.exports = { loadHome };
