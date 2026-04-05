import { useState } from "react";
import maplibregl from "maplibre-gl";

interface SearchProps {
  name: string;
  mapInstance?: maplibregl.Map | null;
}

export default function Search({ name, mapInstance }: SearchProps) {
  const [inputValue, setInputValue] = useState<string>("");
  // Xu ly su kien khi nguoi dung nhap vao o tim kiem

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

        // We update GeoJSON sources with returned paths
        if (sourceG) {
          sourceG.setData({
            type: "FeatureCollection",
            features: featuresG,
          });
        }

        if (source1) {
          source1.setData({
            type: "FeatureCollection",
            features: features1,
          });
        }

        // Show layer of the floor we are going to
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

          const floorSelect = document.getElementById(
            "active_floor_select",
          ) as HTMLSelectElement;
          if (floorSelect) floorSelect.value = "0";
        } else if (data.targetFloor === 1) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
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
  );
}
