/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import maplibregl from "maplibre-gl";

interface SearchProps {
  name: string;
  mapInstance?: maplibregl.Map | null;
}

export default function Search({ name, mapInstance }: SearchProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [isShowResult, setIsShowResult] = useState<boolean>(false);
  // Xu ly su kien khi nguoi dung nhap vao o tim kiem

  function getZoomAdjustment(oldLatitude: number, newLatitude: number) {
    return Math.log2(
      Math.cos((newLatitude / 180) * Math.PI) /
        Math.cos((oldLatitude / 180) * Math.PI),
    );
  }
  const submitSearch = async () => {
    // Thuc hien cac hanh dong tim kiem o day, su dung inputValue de lay gia tri nguoi dung da nhap
    const roomNumber = inputValue.trim().split("/")[0];
    const buildingID = inputValue.trim().split("/")[1];

    if (!roomNumber) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/search?room=${roomNumber}&buildingID=${buildingID || ""}`,
      );
      const data = await response.json();

      if (!data || data.error) {
        console.error("Lỗi tìm kiếm:", data?.error);
        return;
      }

      if (mapInstance && data.data) {
        setTotalDistance(data.totalDistance);
        // set data for both floors
        const sourceG = mapInstance.getSource(
          "shortest_path_g_floor",
        ) as maplibregl.GeoJSONSource;
        const source1 = mapInstance.getSource(
          "shortest_path_one_floor",
        ) as maplibregl.GeoJSONSource;

        // filter features for each floor
        const featuresG = data.data.features.filter(
          (f: any) => f.properties.floor === "G",
        );
        const features1 = data.data.features.filter(
          (f: any) => f.properties.floor === "1",
        );

        // Cap nhat data cho tung source
        // SOurce cho tang G
        if (sourceG) {
          sourceG.setData({
            type: "FeatureCollection",
            features: featuresG,
          });
        }
        // Source cho tang 1 neu có tồn tại
        if (source1) {
          source1.setData({
            type: "FeatureCollection",
            features: features1,
          });
        }

        // hiển thị layer theo layer đã được tạo sẵn trên geoserver
        if (data.targetFloor === 0) {
          mapInstance.setLayoutProperty(
            "workspace_network_analysis:mv_short_path_g_floor",
            "visibility",
            "visible",
          );
          mapInstance.setLayoutProperty(
            "workspace_network_analysis:mv_short_path_one_floor",
            "visibility",
            "none",
          );

          // Cập nhật giá trị của dropdown chọn tầng
          const floorSelect = document.getElementById(
            "active_floor_select",
          ) as HTMLSelectElement;
          if (floorSelect) floorSelect.value = "0";
        } else if (data.targetFloor === 1) {
          // neu targetFloor là 1 thì hiển thị layer của tầng 1 và ẩn layer của tầng G
          mapInstance.setLayoutProperty(
            "workspace_network_analysis:mv_short_path_g_floor",
            "visibility",
            "visible",
          );
          mapInstance.setLayoutProperty(
            "workspace_network_analysis:mv_short_path_one_floor",
            "visibility",
            "visible",
          );

          const floorSelect = document.getElementById(
            "active_floor_select",
          ) as HTMLSelectElement;
          if (floorSelect) floorSelect.value = "1";
        }
        let zoomIn = true;
        const mapZoom = mapInstance.getZoom();
        console.log("Current zoom:", mapZoom);
        const delta =
          (zoomIn ? 1.5 : -1.5) +
          getZoomAdjustment(mapInstance.getCenter().lat, 10);
        console.log("Zoom adjustment:", delta);

        const zoom = 18.999999;
        mapInstance.easeTo({ zoom, duration: 1000 });
        setIsShowResult(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="search_sidebar">
      <div className="search custom_search z-11">
        <i
          className="fa-solid fa-magnifying-glass search-icon"
          onClick={submitSearch}
        ></i>
        <input
          type="text"
          className="search--input"
          placeholder={name}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
        />
      </div>
      {isShowResult && (
        <div className="result_search fixed top-20 left-2 bg-white rounded-lg shadow-lg z-11 w-80">
          <div className="result_line bg-blue-500"></div>
          <div className="result-content p-2">
            <div className="result-header flex items-center gap-2 ">
              <i className="fa-solid fa-map icon_result "></i>
              <h2 className="result--title font-bold text-2xl text-blue-600">
                Thông tin sau khi tìm kiếm
              </h2>
            </div>
            <div className="result-body mt-4 pl-2">
              <h3 className="startPoint font-bold text-lg mb-2">
                Điểm bắt đầu:{" "}
                <span className="startPoint_value value">
                  Lối đi chính trường CNTT
                </span>
              </h3>
              <h3 className="endPoint font-bold text-lg mb-2">
                Điểm kết thúc:{" "}
                <span className="endPoint_value value">Phòng {inputValue}</span>
              </h3>
              <h3 className="distance font-bold text-lg mb-2">
                Tổng khoảng cách:{" "}
                <span className="distance_value value">{totalDistance}</span>{" "}
                mét
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
