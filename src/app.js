const express = require("express");
const cors = require("cors");
const bouquetRoutes = require("./routes/bouquetRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Bouquet CRUD API",
    endpoints: {
      health: "/api/health",
      bouquets: "/api/bouquets",
      summary: "/api/bouquets/meta/summary"
    }
  });
});

app.get("/api/health", (req, res) => {
  const isConnected = require("mongoose").connection.readyState === 1;
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "ok" : "unavailable",
    database: isConnected ? "connected" : "disconnected"
  });
});

app.use("/api/bouquets", bouquetRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((item) => item.message)
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({
      message: `A bouquet with this ${Object.keys(err.keyValue || {})[0] || "value"} already exists`
    });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
