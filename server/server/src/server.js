import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureAdmin } from "./utils/ensureAdmin.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(ensureAdmin) // creates your login from ADMIN_EMAIL / ADMIN_PASSWORD on first start
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Could not start server:", err.message);
    process.exit(1);
  });