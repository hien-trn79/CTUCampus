import express from "express";
import cors from "cors";
import "dotenv/config";
import db from "../config/index.config.js";
import checkDatabaseError from "../middleware/checkErrorDatabase.middleware";
import seacrhRouter from "../router/index.route.js";

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
// thuc hien cac route
app.use("/api", seacrhRouter);

// Ket noi voi co so du lieu
db.database
  .connect()
  .then(() => {
    console.log(
      "Ket noi voi co so du lieu highway_cict_one_floor_full thanh cong",
    );
  })
  .catch((error) => {
    checkDatabaseError(
      error,
      "Loi khi ket noi voi co so du lieu highway_cict_one_floor_full",
    );
  });

app.listen(port, () => {
  console.log(`Server dang chay tai http://localhost:${port}/api/`);
});
