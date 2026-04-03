import { Pool } from "pg";
import express from "express";
import cors from "cors";
import "dotenv/config";
import checkDatabaseError from "../../middleware/checkErrorDatabase.middleware";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

pool
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
  })
  .catch((error) => {
    console.error("Error connecting to PostgreSQL database:", error);
  });

app.post("/api/update_path", async (req, res) => {
  const { start, end, level } = req.body;
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // BƯỚC 1: Kiểm tra bảng points
    try {
      await client.query("DELETE FROM points");
    } catch (err) {
      checkDatabaseError(err, "Dọn dẹp bảng points (Có thể bảng chưa tồn tại)");
      throw err;
    }

    // BƯỚC 2: Kiểm tra chèn dữ liệu
    try {
      const insertPointQuery = `
                INSERT INTO points (geom, level) 
                VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`;
      await client.query(insertPointQuery, [start.lng, start.lat, level]);
      await client.query(insertPointQuery, [end.lng, end.lat, level]);
    } catch (err) {
      checkDatabaseError(
        err,
        "Chèn điểm vào bảng points (Kiểm tra cột 'level' đã có chưa?)",
      );
      throw err;
    }

    // BƯỚC 3: Kiểm tra View
    let refreshQuery =
      level === 0
        ? `SELECT * FROM mv_short_path_g_floor`
        : `SELECT * FROM mv_short_path_one_floor`;
    try {
      const result = await client.query(refreshQuery);
      await client.query("COMMIT");
      res.json({ status: "success", data: result.rows });
    } catch (err) {
      checkDatabaseError(
        err,
        `Gọi View ${refreshQuery} (Kiểm tra View có bị lỗi định nghĩa không?)`,
      );
      throw err;
    }
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({
      error: "Lỗi hệ thống",
      message: error.message,
      step_error: error.context, // Nếu bạn muốn trả về bước bị lỗi cho frontend
    });
  } finally {
    if (client) client.release();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(
    `Server routing running at http://localhost:${port}/api/update_path`,
  );
});
