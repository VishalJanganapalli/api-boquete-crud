const express = require("express");
const mongoose = require("mongoose");
const Bouquet = require("../models/Bouquet");

const router = express.Router();
const writableFields = [
  "name", "sku", "description", "shortDescription", "price", "compareAtPrice",
  "category", "occasion", "flowers", "color", "size", "stockQuantity", "thumbnail",
  "images", "tags", "isFeatured", "isNewArrival", "isOnSale", "hasFreeDelivery", "status"
];
const sortableFields = ["price", "name", "createdAt", "stockQuantity"];

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseBoolean(value, field) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw Object.assign(new Error(`${field} must be true or false`), { status: 400 });
}

function parseNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw Object.assign(new Error(`${field} must be a valid number`), { status: 400 });
  }
  return number;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findBouquet(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid bouquet ID" });
  }

  const bouquet = await Bouquet.findById(req.params.id);
  if (!bouquet) return res.status(404).json({ message: "Bouquet not found" });
  res.json(bouquet);
}

router.get(
  "/meta/summary",
  asyncHandler(async (req, res) => {
    const [total, categories, stock] = await Promise.all([
      Bouquet.countDocuments(),
      Bouquet.distinct("category"),
      Bouquet.aggregate([
        { $group: { _id: null, unitsAvailable: { $sum: "$stockQuantity" } } }
      ])
    ]);

    res.json({
      totalBouquets: total,
      categories: categories.sort(),
      unitsAvailable: stock[0] ? stock[0].unitsAvailable : 0
    });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    const {
      search, category, occasion, color, size, minPrice, maxPrice, inStock,
      stockStatus, tags, isFeatured, isNewArrival, isOnSale, hasFreeDelivery,
      sortBy = "createdAt", order = "desc"
    } = req.query;

    if (search) {
      const matcher = new RegExp(escapeRegex(String(search)), "i");
      filter.$or = [
        { name: matcher }, { description: matcher }, { category: matcher },
        { occasion: matcher }, { flowers: matcher }, { tags: matcher }, { sku: matcher }
      ];
    }
    if (category) filter.category = new RegExp(`^${escapeRegex(String(category))}$`, "i");
    if (occasion) filter.occasion = new RegExp(`^${escapeRegex(String(occasion))}$`, "i");
    if (color) filter.color = new RegExp(`^${escapeRegex(String(color))}$`, "i");
    if (size) filter.size = new RegExp(`^${escapeRegex(String(size))}$`, "i");

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = parseNumber(minPrice, "minPrice");
      if (maxPrice !== undefined) filter.price.$lte = parseNumber(maxPrice, "maxPrice");
      if (filter.price.$gte !== undefined && filter.price.$lte !== undefined &&
          filter.price.$gte > filter.price.$lte) {
        return res.status(400).json({ message: "minPrice cannot be greater than maxPrice" });
      }
    }
    if (inStock !== undefined) {
      filter.stockQuantity = parseBoolean(inStock, "inStock") ? { $gt: 0 } : 0;
    }
    if (stockStatus) {
      const stockFilters = {
        IN_STOCK: { $gt: 5 },
        LOW_STOCK: { $gt: 0, $lte: 5 },
        OUT_OF_STOCK: 0
      };
      if (!stockFilters[stockStatus]) {
        return res.status(400).json({ message: "stockStatus must be IN_STOCK, LOW_STOCK, or OUT_OF_STOCK" });
      }
      filter.stockQuantity = stockFilters[stockStatus];
    }
    if (tags) {
      filter.tags = {
        $in: String(tags).split(",").map((tag) => tag.trim()).filter(Boolean)
      };
    }
    for (const field of ["isFeatured", "isNewArrival", "isOnSale", "hasFreeDelivery"]) {
      if (req.query[field] !== undefined) filter[field] = parseBoolean(req.query[field], field);
    }
    if (!sortableFields.includes(sortBy)) {
      return res.status(400).json({ message: `sortBy must be one of: ${sortableFields.join(", ")}` });
    }
    if (order !== "asc" && order !== "desc") {
      return res.status(400).json({ message: "order must be asc or desc" });
    }

    const bouquets = await Bouquet.find(filter).sort({ [sortBy]: order === "asc" ? 1 : -1 });
    res.json(bouquets);
  })
);

router.get("/:id", asyncHandler(findBouquet));

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const bouquet = await Bouquet.create(req.body);
    res.status(201).json(bouquet);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bouquet ID" });
    }
    const current = await Bouquet.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Bouquet not found" });

    const replacement = new Bouquet({ ...req.body, _id: current._id });
    await replacement.validate();
    const updated = await Bouquet.findOneAndReplace(
      { _id: req.params.id },
      replacement.toObject(),
      {
      new: true,
      runValidators: true
      }
    );
    res.json(updated);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bouquet ID" });
    }
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([field]) => writableFields.includes(field))
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one supported field to update" });
    }

    const bouquet = await Bouquet.findById(req.params.id);
    if (!bouquet) return res.status(404).json({ message: "Bouquet not found" });
    bouquet.set(updates);
    await bouquet.save();
    res.json(bouquet);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bouquet ID" });
    }
    const bouquet = await Bouquet.findByIdAndDelete(req.params.id);
    if (!bouquet) return res.status(404).json({ message: "Bouquet not found" });
    res.json({ message: "Bouquet deleted successfully", deletedBouquet: bouquet });
  })
);

module.exports = router;
