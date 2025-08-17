// import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/realtime-docs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API routes
app.use("/api/documents", documentRoutes);

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
