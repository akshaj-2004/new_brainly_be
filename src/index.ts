import express from "express";
import dotenv from "dotenv";
import { createCollection } from "./utils/qdrant.js";
import authRouter from "./routes/auth/index.js"
import crudRouter from "./routes/crud/index.js"
import cors from "cors"

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors())

app.use("/api/v1", authRouter);
app.use("/api/v1", crudRouter);


(async () => {
  try {
    await createCollection();
    console.log("✅ Qdrant collection is ready");
  } catch (err) {
    console.error("❌ Failed to ensure Qdrant collection:", err);
    process.exit(1);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
