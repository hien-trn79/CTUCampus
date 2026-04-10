/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";

interface OneFloorProps {
  mapInstance: maplibregl.Map | null;
  setShowNotification: (value: boolean) => void;
  setNotificationInfo: (info: {
    type: string;
    content: string;
    description: string;
  }) => void;
  currentMarkers: maplibregl.Marker[];
  setCurrentMarkers: (markers: maplibregl.Marker[]) => void;
  currentPoints: [number, number][];
  setCurrentPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

export default function One_Floor({
  mapInstance,
  setShowNotification,
  setNotificationInfo,
  currentMarkers,
  setCurrentMarkers,
  currentPoints,
  setCurrentPoints,
}: OneFloorProps) {
  const [data, setData] = useState(null);
  const [networkData, setNetworkData] = useState<FeatureCollection | null>(
    null,
  );
  // --------------------- Functions ----------------
  // Xu ly thao tac zoom den
  function getZoomAdjustment(oldLatitude: number, newLatitude: number) {
    return Math.log2(
      Math.cos((newLatitude / 180) * Math.PI) /
        Math.cos((oldLatitude / 180) * Math.PI),
    );
  }

  // Fetch Data
  useEffect(() => {
    if (!mapInstance) return;

    const fetchData = async () => {
      try {
        const response = await fetch("/assets/CICT/demo/CICT_wall_(4).geojson");
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error("Error fetching GeoJSON data:", error);
      }
    };

    const fetchNetworkData = async () => {
      try {
        const response = await fetch(
          "/assets/CICT/indoor/network_lines (1).geojson",
        );
        const jsonData = await response.json();
        setNetworkData(jsonData);
      } catch (error) {
        console.error("Error fetching GeoJSON data:", error);
      }
    };

    fetchNetworkData();

    fetchData();
  }, [mapInstance]);

  useEffect(() => {
    if (!data || !mapInstance) return;
    mapInstance.addSource("di_one_floor", {
      type: "geojson",
      data: data,
    });

    mapInstance.addLayer({
      id: "di_one_floor_layer",
      type: "fill-extrusion",
      source: "di_one_floor",
      paint: {
        "fill-extrusion-color": [
          "match",
          ["get", "Layer"],
          "wall",
          "#A0A095",
          "room",
          "#85D1DB",
          "corridor",
          "#D3D3D3",
          "wc",
          "#448061",
          "hoitruong",
          "#D97068",
          "stair",
          "#FECB00",
          "hangrao",
          "#FF634A",
          "#ccc",
        ],
        "fill-extrusion-height": [
          "match",
          ["get", "Layer"],
          "wall",
          12,
          "stair",
          10.5,
          "hangrao",
          9,
          8,
        ],
        "fill-extrusion-base": 7,
        "fill-extrusion-opacity": 1,
      },
      maxzoom: 19,
    });

    // add highway layer one floor
    mapInstance.on("load", () => {
      mapInstance.addSource("highway_cict_one_floor", {
        type: "raster",
        tiles: [
          "http://localhost:8080/geoserver/workspace_network_analysis/wms?" +
            "service=WMS&" +
            "version=1.1.1&" +
            "request=GetMap&" +
            "layers=workspace_network_analysis:highway_cict_one_floor&" +
            "bbox={bbox-epsg-3857}&" +
            "width=256&" +
            "height=256&" +
            "srs=EPSG:3857&" +
            "format=image/png&" +
            "transparent=true&" +
            "styles=",
        ],
        tileSize: 256,
      });

      // them layer tu soure vua add
      mapInstance.addLayer({
        id: "workspace_network_analysis:highway_cict_one_floor",
        type: "raster",
        source: "highway_cict_one_floor",
        layout: {
          visibility: "none",
        },
      });

      // them source cua shortest path one floor
      if (!mapInstance.getSource("shortest_path_one_floor")) {
        mapInstance.addSource("shortest_path_one_floor", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        mapInstance.addLayer({
          id: "workspace_network_analysis:mv_short_path_one_floor",
          type: "fill-extrusion",
          source: "shortest_path_one_floor",
          layout: {
            visibility: "none",
          },
          paint: {
            "fill-extrusion-color": "#3852B4",
            "fill-extrusion-base": 8.1, // Độ cao bằng với layer tầng 1
            "fill-extrusion-height": 8.2,
            "fill-extrusion-opacity": 0.9,
          },
          maxzoom: 19,
        });
      }

      // Xu ly su kien maker cho layer one floor
      let isEditing = false;
      let startPoint: maplibregl.Marker | null = null;
      let endPoint: maplibregl.Marker | null = null;
      let markers: maplibregl.Marker[] = [];
      const editButton = document.querySelector(".button_find_route");

      const clearMakers = () => {
        currentMarkers.forEach((marker) => marker.remove());
        setCurrentMarkers([]);
        setCurrentPoints([]);
        startPoint = null;
        endPoint = null;
      };

      const onBtnClickFloor1 = () => {
        const floorSelect = document.getElementById(
          "active_floor_select",
        ) as HTMLSelectElement;
        const currentFloor = floorSelect ? floorSelect.value : "1";

        // Return if this button click is meant for another floor
        if (currentFloor !== "1") return;

        // Hide Floor G route when working on Floor 1
        if (
          mapInstance &&
          mapInstance.getLayer(
            "workspace_network_analysis:mv_short_path_g_floor",
          )
        ) {
          mapInstance.setLayoutProperty(
            "workspace_network_analysis:mv_short_path_g_floor",
            "visibility",
            "none",
          );
        }

        if (!isEditing) {
          isEditing = true;
          clearMakers();
          if (editButton) {
            let zoomIn = true;
            const mapZoom = mapInstance.getZoom();
            console.log("Current zoom:", mapZoom);
            const delta =
              (zoomIn ? 1.5 : -1.5) +
              getZoomAdjustment(mapInstance.getCenter().lat, 10);
            console.log("Zoom adjustment:", delta);

            const zoom = 18.9;
            mapInstance.easeTo({ zoom, duration: 1000 });
            editButton.textContent = "Submit Route Tầng 1";
            editButton.classList.add("active");
          }

          setShowNotification(true);
          setNotificationInfo({
            type: "warning",
            content: "Chọn điểm bắt đầu và kết thúc",
            description:
              "Nhấp vào bản đồ để chọn điểm bắt đầu (xanh) và kết thúc (đỏ).",
          });
        } else {
          if (startPoint && endPoint) {
            fetch("http://localhost:5001/api/update_path", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                start: startPoint.getLngLat(),
                end: endPoint.getLngLat(),
                level: 1,
              }),
            })
              .then((response) => response.json())
              .then((resData) => {
                if (!mapInstance) return;

                const source = mapInstance.getSource(
                  "shortest_path_one_floor",
                ) as maplibregl.GeoJSONSource;
                if (source && resData.data) {
                  source.setData(resData.data);
                }
                mapInstance.setLayoutProperty(
                  "workspace_network_analysis:mv_short_path_one_floor",
                  "visibility",
                  "visible",
                );
              });
          } else {
            setShowNotification(true);
            setNotificationInfo({
              type: "warning",
              content: "Thiếu điểm bắt đầu hoặc kết thúc",
              description:
                "Vui lòng chọn cả điểm bắt đầu và kết thúc trước khi submit.",
            });
          }
          isEditing = false;
          if (editButton) {
            editButton.textContent = "Find Route";
            editButton.classList.remove("active");
          }
        }
      };

      // Xóa listener cũ để tránh binding nhiều lần (giải quyết lỗi Click 1 nút chạy nhiều lần)
      const oldBtnHandler = (editButton as any)._onClickHandlerFloor1;
      if (oldBtnHandler) {
        editButton?.removeEventListener("click", oldBtnHandler);
      }
      (editButton as any)._onClickHandlerFloor1 = onBtnClickFloor1;
      editButton?.addEventListener("click", onBtnClickFloor1);

      const onMapClick = (e: any) => {
        if (!isEditing) return;

        if (!startPoint) {
          startPoint = new maplibregl.Marker({ color: "green" })
            .setLngLat(e.lngLat)
            .addTo(mapInstance);
          currentMarkers.push(startPoint);
        } else if (!endPoint) {
          endPoint = new maplibregl.Marker({ color: "red" })
            .setLngLat(e.lngLat)
            .addTo(mapInstance);
          currentMarkers.push(endPoint);
        } else {
          setShowNotification(true);
          setNotificationInfo({
            type: "success",
            content: "Đã chọn đủ điểm",
            description:
              "Bạn đã chọn đủ điểm bắt đầu và kết thúc. Vui lòng nhấn nút Submit hoặc xóa.",
          });
        }
      };

      mapInstance.on("click", "di_one_floor_layer", onMapClick);
    });
  }, [mapInstance, data]);

  return (
    <div className="one_floor">
      <h1>One Floor of CICT</h1>
    </div>
  );
}
