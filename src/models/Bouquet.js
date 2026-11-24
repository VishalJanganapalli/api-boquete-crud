const mongoose = require("mongoose");

const bouquetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    shortDescription: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0.01 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    category: { type: String, required: true, trim: true },
    occasion: { type: String, default: "", trim: true },
    flowers: { type: [String], required: true, validate: [(items) => items.length > 0, "Add at least one flower type"] },
    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, enum: ["Small", "Medium", "Large", "Premium"] },
    stockQuantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    thumbnail: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    hasFreeDelivery: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" }
  },
  { timestamps: true }
);

bouquetSchema.pre("validate", function () {
  if (this.compareAtPrice !== null && this.compareAtPrice > this.price) {
    this.discountPercentage = Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
    this.isOnSale = true;
  } else {
    this.discountPercentage = 0;
  }
});

module.exports = mongoose.model("Bouquet", bouquetSchema);
