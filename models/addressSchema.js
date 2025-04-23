const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  address: [
    {
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      streetAddress: {
        type: String,
        required: true,
      },
      apartment: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: true,
      },
      postcode: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      altPhone: {
        type: String,
        required: false,
      },
    },
  ],
});

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
