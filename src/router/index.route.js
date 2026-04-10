import express from "express";

import db from "../config/index.config.js";

const router = express.Router();

// [GET] /api/search?room=
router.get("/search", async (req, res) => {
  let { room, buildingID, startLng, startLat } = req.query;
  let client;

  try {
    client = await db.database.connect();
    await client.query("BEGIN");

    if (!startLng || !startLat) {
      const startNodeRes = await client.query(
        "SELECT ST_X(geom) as lng, ST_Y(geom) as lat FROM network_nodes_g_floor WHERE id = 2",
      );
      if (startNodeRes.rows.length > 0) {
        startLng = startNodeRes.rows[0].lng;
        startLat = startNodeRes.rows[0].lat;
      }
    }
    // vi tri cau thang tang G va cau thang tang 1, dung de tim duong di khi co su chuyen tang
    const STAIR_NODE_G_FLOORid = 227;
    // hien thi toa do cau thang tang G va cau thang tang 1 de kiem tra khi chay code
    const stairNodeG = await client.query(
      "SELECT ST_X(geom) as lng, ST_Y(geom) as lat FROM network_nodes_g_floor WHERE id = $1",
      [STAIR_NODE_G_FLOORid],
    );
    const STAIR_NODE_ONE_FLOORid = 236;
    const stairNode1 = await client.query(
      "SELECT ST_X(geom) as lng, ST_Y(geom) as lat FROM network_nodes WHERE id = $1",
      [STAIR_NODE_ONE_FLOORid],
    );

    const stairLngG =
      stairNodeG.rows.length > 0 ? stairNodeG.rows[0].lng : null;
    const stairLatG =
      stairNodeG.rows.length > 0 ? stairNodeG.rows[0].lat : null;
    const stairLng1 =
      stairNode1.rows.length > 0 ? stairNode1.rows[0].lng : null;
    const stairLat1 =
      stairNode1.rows.length > 0 ? stairNode1.rows[0].lat : null;

    let targetFloor = 1;
    let endNodeRes = await client.query(
      "SELECT ST_X(geom) as lng, ST_Y(geom) as lat FROM network_nodes WHERE name ILIKE $1 LIMIT 1",
      ["%" + room + "%"],
    );

    if (endNodeRes.rows.length === 0) {
      endNodeRes = await client.query(
        "SELECT ST_X(geom) as lng, ST_Y(geom) as lat FROM network_nodes_g_floor WHERE name ILIKE $1 LIMIT 1",
        ["%" + room + "%"],
      );
      targetFloor = 0;
    }

    if (endNodeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Không tìm thấy phòng ở cả 2 tầng" });
    }

    const idGoalLng = endNodeRes.rows[0].lng;
    const idGoalLat = endNodeRes.rows[0].lat;

    await client.query("DELETE FROM points_g_floor");
    await client.query("DELETE FROM points");

    const insertPointGQuery =
      "INSERT INTO points_g_floor (geom, level) VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)";
    const insertPoint1Query =
      "INSERT INTO points (geom, level) VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)";

    if (targetFloor === 0) {
      await client.query(insertPointGQuery, [startLng, startLat, 0]);
      await client.query(insertPointGQuery, [idGoalLng, idGoalLat, 0]);
    } else if (targetFloor === 1) {
      if (!stairLngG || !stairLng1) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error:
            "Chưa cấu hình tọa độ Cầu Thang, vui lòng kiểm tra ID cầu thang trong code search.",
        });
      }
      // vi tri tu loi di chinh cua tang G den cau thang so 2 cuar tang G
      await client.query(insertPointGQuery, [startLng, startLat, 0]);
      await client.query(insertPointGQuery, [stairLngG, stairLatG, 0]);

      await client.query(insertPoint1Query, [stairLng1, stairLat1, 1]);
      await client.query(insertPoint1Query, [idGoalLng, idGoalLat, 1]);
    }

    const viewG = await client.query(
      "SELECT ST_AsGeoJSON(ST_Buffer(geom::geography, 0.5)::geometry) as geojson FROM mv_short_path_g_floor",
    );
    const view1 = await client.query(
      "SELECT ST_AsGeoJSON(ST_Buffer(geom::geography, 0.5)::geometry) as geojson FROM mv_short_path_one_floor",
    );

    await client.query("COMMIT");

    // chuyen thanh du lieu GeoJSON de tra ve cho client
    const featuresG = viewG.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: { floor: "G" },
    }));

    const features1 = view1.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: { floor: "1" },
    }));

    // Xu ly tinh do dai duong di tren tang G va tang 1 de tra ve cho client, neu co chuyen tang thi tinh tong do dai cua ca 2 tang
    let totalDistance = 0;
    if (targetFloor === 0) {
      const distanceRes = await client.query(
        "SELECT SUM(ST_Length(geom::geography)) as distance FROM mv_short_path_g_floor",
      );
      totalDistance = distanceRes.rows[0].distance || 0;
    } else if (targetFloor === 1) {
      const distanceGRes = await client.query(
        "SELECT SUM(ST_Length(geom::geography)) as distance FROM mv_short_path_g_floor",
      );
      const distance1Res = await client.query(
        "SELECT SUM(ST_Length(geom::geography)) as distance FROM mv_short_path_one_floor",
      );
      const distanceG = distanceGRes.rows[0].distance || 0;
      const distance1 = distance1Res.rows[0].distance || 0;
      totalDistance = distanceG + distance1;
    }

    res.json({
      status: "success",
      targetNode: { lng: idGoalLng, lat: idGoalLat },
      targetFloor: targetFloor,
      data: {
        type: "FeatureCollection",
        features: [...featuresG, ...features1],
      },
      totalDistance: totalDistance,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    res.status(500).json({ error: "Lỗi", message: error.message });
  } finally {
    if (client) client.release();
  }
});
// [POST] api/update_path
router.post("/update_path", async (req, res, next) => {
  try {
    const { start, end, level } = req.body;

    //kiem tra ket noi co so du lieu
    let client;
    try {
      client = await db.database.connect();
      await client.query("BEGIN");

      // kiem tra level cua tang G thuc hien
      if (level === 0) {
        // kiem tra bang points_g_floor de thuc hien tim duong di o tang G
        await client.query("DELETE FROM points_g_floor");

        // Chen du lieu
        const insertPointQuery = `
                  INSERT INTO points_g_floor (geom, level)
                  VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`;
        await client.query(insertPointQuery, [start.lng, start.lat, level]);
        await client.query(insertPointQuery, [end.lng, end.lat, level]);

        // Kiem tra View
        const refreshViewQuery = `SELECT ST_AsGeoJSON(ST_Buffer(geom::geography, 0.5)::geometry) as geojson FROM mv_short_path_g_floor`;

        try {
          const result = await client.query(refreshViewQuery);
          await client.query("COMMIT");

          const features = result.rows.map((row) => ({
            type: "Feature",
            geometry: JSON.parse(row.geojson),
            properties: {},
          }));
          res.json({
            status: "success",
            data: { type: "FeatureCollection", features },
          });
        } catch (err) {
          checkDatabaseError(
            err,
            `Gọi View ${refreshViewQuery} (Kiểm tra View có bị lỗi định nghĩa không?)`,
          );
          throw err;
        } finally {
          if (client) client.release();
        }
      }

      // kiem tra level cua tang 1 thuc hien
      if (level === 1) {
        // kiem tra bang points_one_floor de thuc hien tim duong di o tang 1
        await client.query("DELETE FROM points");

        // Chen du lieu
        const insertPointQuery = `
                  INSERT INTO points (geom, level)
                  VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`;
        await client.query(insertPointQuery, [start.lng, start.lat, level]);
        await client.query(insertPointQuery, [end.lng, end.lat, level]);

        // Kiem tra View
        const refreshViewQuery = `SELECT ST_AsGeoJSON(ST_Buffer(geom::geography, 0.5)::geometry) as geojson FROM mv_short_path_one_floor`;

        try {
          const result = await client.query(refreshViewQuery);
          await client.query("COMMIT");

          const features = result.rows.map((row) => ({
            type: "Feature",
            geometry: JSON.parse(row.geojson),
            properties: {},
          }));
          res.json({
            status: "success",
            data: { type: "FeatureCollection", features },
          });
        } catch (err) {
          checkDatabaseError(
            err,
            `Gọi View ${refreshViewQuery} (Kiểm tra View có bị lỗi định nghĩa không?)`,
          );
          throw err;
        } finally {
          if (client) client.release();
        }
      }
    } catch (error) {
      checkDatabaseError(
        error,
        "Lỗi khi kết nối với cơ sở dữ liệu trong route /api/update_path",
      );
      throw error; // Đảm bảo lỗi được ném ra để bị catch ở block bên ngoài
    }
  } catch (error) {
    res.status(500).json({
      error: "Lỗi hệ thống",
      message: error.message,
    });
  }
});

export default router;
