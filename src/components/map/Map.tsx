/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import MapGeolocate from "./MapGeolocate";
import G_Floor from "../buildings/DI/floors/G_Floor";
import One_Floor from "../buildings/DI/floors/One_Floor";
import Search from "../Menu/Search";

import Notification from "../notification/Notification";

import MenuBar from "../Menu/MenuBar";

import { center } from "@turf/center";

export default function Map() {
  const [showMenuBar, setShowMenuBar] = useState(false);
  const showMenuBarRef = useRef(showMenuBar);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [dataCanTho, setDataCanTho] = useState(null);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationInfo, setNotificationInfo] = useState({
    type: "success",
    content: "Notification Title",
    description: "This is the description of the notification.",
  });

  const [currentMarkers, setCurrentMarkers] = useState<maplibregl.Marker[]>([]);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);

  // --------------------- Functions ----------------
  // Xu ly thao tac zoom den
  function getZoomAdjustment(oldLatitude: number, newLatitude: number) {
    return Math.log2(
      Math.cos((newLatitude / 180) * Math.PI) /
        Math.cos((oldLatitude / 180) * Math.PI),
    );
  }

  // Tự động ẩn notification sau khi animation kết thúc
  document.addEventListener("animationend", (e) => {
    if (e.animationName === "fadeOut") {
      setShowNotification(false);
    }
  });

  const cleanMakers = () => {
    currentMarkers.forEach((marker) => {
      marker.remove();
    });
    setCurrentMarkers([]);
    setCurrentPoints([]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [buildingClicked, setBuildingClicked] = useState<any>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/assets/map_demo(1).geojson");
        const jsonData = await response.json();
        setDataCanTho(jsonData);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  // Viet ham tim duong
  const getRoute = async (
    start: [number, number],
    end: [number, number],
    mapObj: maplibregl.Map,
  ) => {
    try {
      // call API
      const query = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`,
      );
      // trả về kết quả dưới dạng JSON
      const json = await query.json();
      if (!json.routes || json.routes.length === 0) return;
      const data = json.routes[0];
      const route = data.geometry;

      // thêm source vào maplibre
      const source = mapObj.getSource("route") as maplibregl.GeoJSONSource;
      // cập nhật dữ liệu cho source
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: route,
        });
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: "https://tiles.openfreemap.org/styles/bright",
      zoom: 18,
      center: [105.769053, 10.030951],
      pitch: 10,
      canvasContextAttributes: { antialias: true },
    });

    map.on("load", () => {
      // thêm source và layer cho route ngay khi map load xong
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      // Thêm layer cho route đến 2 marker
      map.addLayer({
        id: "route_layer",
        type: "line",
        source: "route",
        paint: {
          "line-color": "blue",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });

      // Tat duong di khi nhan vao o tim kiem
      document
        .querySelector(".search--input")
        ?.addEventListener("keydown", (e) => {
          if ((e as KeyboardEvent).key == "Enter") {
            cleanMakers();
            if (map.getLayer("route_layer")) {
              map.setLayoutProperty("route_layer", "visibility", "none");
            }
            e.preventDefault();
          }
        });
    });

    // let currentMarkers: maplibregl.Marker[] = [];
    // let currentPoints: [number, number][] = [];
    let isEditingCTU = false;

    const handleRouteCTUToggle = () => {
      const floorSelect = document.getElementById(
        "active_floor_select",
      ) as HTMLSelectElement;
      if (floorSelect && floorSelect.value !== "CTU") return;

      const btn = document.querySelector(".button_find_route");
      if (!isEditingCTU) {
        isEditingCTU = true;
        currentMarkers.forEach((m) => m.remove());
        currentPoints.length = 0; // Clear points array
        setCurrentMarkers([]);
        setCurrentPoints([]);

        // Reset layer
        const source = map.getSource("route") as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          });
        }

        if (btn) {
          const center: [number, number] = [105.769098, 10.031102];
          const zoom = 17;
          map.easeTo({ center, zoom, duration: 1000 });

          btn.textContent = "Submit Route CTU";
          btn.classList.add("bg-red-500", "hover:bg-red-700", "active");
          btn.classList.remove("bg-blue-500", "hover:bg-blue-700");
        }
        setShowNotification(true);
        setNotificationInfo({
          type: "warning",
          content: "Chế độ chọn đường đi Khu II",
          description:
            "Vui lòng chọn điểm bắt đầu và kết thúc trên bản đồ (Khu II).",
        });
      } else {
        if (currentPoints.length === 2) {
          getRoute(currentPoints[0], currentPoints[1], map).then(() => {
            if (map.getLayer("route_layer")) {
              map.setLayoutProperty("route_layer", "visibility", "visible");
            }
          });
        } else {
          setShowNotification(true);
          setNotificationInfo({
            type: "error",
            content: "Lỗi chọn đường đi Khu II",
            description: "Vui lòng chọn đủ 2 điểm Start và End.",
          });
        }
        isEditingCTU = false;
        if (btn) {
          btn.textContent = "Find Route";
          btn.classList.add("bg-blue-500", "hover:bg-blue-700");
          btn.classList.remove("bg-red-500", "hover:bg-red-700", "active");
        }
      }
    };

    // Gắn listener vào nút
    const initBtnCTU = () => {
      const btn = document.querySelector(".button_find_route");
      if (btn) {
        const oldHandler = (btn as any)._onClickHandlerCTU;
        if (oldHandler) btn.removeEventListener("click", oldHandler);
        (btn as any)._onClickHandlerCTU = handleRouteCTUToggle;
        btn.addEventListener("click", handleRouteCTUToggle);
      }
    };

    setTimeout(initBtnCTU, 500);

    map.on("click", "khu_ii_dhct_layer", (e) => {
      const features = e.features?.[0];
      const props = features?.properties;
      if (!props || !features) return;
      const centerPoint = center(features);

      if (isEditingCTU) {
        if (currentPoints.length >= 2) {
          setShowNotification(true);
          setNotificationInfo({
            type: "warning",
            content: "Lỗi chọn đường đi Khu II",
            description: "Bạn đã chọn đủ 2 điểm. Vui lòng Submit để tìm đường.",
          });
          return;
        }

        const marker = new maplibregl.Marker({
          color: currentPoints.length === 0 ? "green" : "red",
        })
          .setLngLat(centerPoint.geometry.coordinates as [number, number])
          .setPopup(
            new maplibregl.Popup().setHTML(
              currentPoints.length === 0 ? "Start" : "End",
            ),
          )
          .addTo(map);

        setCurrentMarkers((prev) => [...prev, marker]);
        setCurrentPoints((prev) => [
          ...prev,
          centerPoint.geometry.coordinates as [number, number],
        ]);
        return; // Không mở menu bar khi đang mode tìm đường
      }

      // Xử lý bình thường khi click vào tòa nhà (khi không tìm đường)
      // Mở menu bar thay vì tạo marker
      setBuildingClicked(features || null);
      setShowMenuBar(true);
    });

    // Click vào vị trí bất kỳ ngoài tòa nhà
    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["khu_ii_dhct_layer"],
      });

      // Nếu click trúng layer thì bỏ qua, đã xử lý ở trên
      if (features.length > 0) return;

      if (isEditingCTU) {
        if (currentPoints.length >= 2) {
          setShowNotification(true);
          setNotificationInfo({
            type: "warning",
            content: "Lỗi chọn đường đi Khu II",
            description: "Bạn đã chọn đủ 2 điểm. Vui lòng Submit để tìm đường.",
          });
          return;
        }

        const lngLat = e.lngLat;
        const coords: [number, number] = [lngLat.lng, lngLat.lat];

        const marker = new maplibregl.Marker({
          color: currentPoints.length === 0 ? "green" : "red",
        })
          .setLngLat(coords)
          .setPopup(
            new maplibregl.Popup().setHTML(
              currentPoints.length === 0 ? "Start" : "End",
            ),
          )
          .addTo(map);

        currentMarkers.push(marker);
        currentPoints.push(coords);
        return;
      }
      setShowMenuBar(false);
      showMenuBarRef.current = false;
    });

    map.flyTo({
      center: [105.769053, 10.030951],
      padding: { left: 400 },
      zoom: 17,
    });

    setMapInstance(map);
    return () => {
      setShowMenuBar(false);
      currentMarkers.forEach((m) => m.remove());
      map.remove();
    };
  }, [setShowMenuBar, setBuildingClicked]);
  // them cac layer khac o day
  useEffect(() => {
    if (!dataCanTho || !mapInstance) return;

    mapInstance.on("load", () => {
      mapInstance.addSource("khu_ii_dhct", {
        type: "geojson",
        data: dataCanTho,
      });

      mapInstance.addLayer({
        id: "khu_ii_dhct_layer",
        type: "fill-extrusion",
        source: "khu_ii_dhct",
        paint: {
          "fill-extrusion-color": "#fff",
          "fill-extrusion-height": 20,
          "fill-extrusion-base": 0.0,
          "fill-extrusion-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0.8,
            18,
            0.9,
          ],
        },
        maxzoom: 18.5,
      });
    });
  }, [dataCanTho, mapInstance]);

  return (
    <div className="">
      <div
        id="map"
        ref={mapContainer}
        style={{ width: "100%", height: "100vh" }}
      >
        <button id="toggle-button">Hide</button>
        <div className="absolute bottom-15 right-5 z-10 flex gap-2 items-center">
          <select
            id="active_floor_select"
            className="bg-white text-gray-800 text-[15px] font-bold p-2.5 rounded-xl shadow-lg cursor-pointer border border-gray-300 hover:bg-gray-50 focus:outline-none"
            defaultValue="CTU"
            onChange={(e) => {
              const btn = document.querySelector(".button_find_route");
              if (btn && !btn.classList.contains("active")) {
                btn.textContent = "Find Route";
              }
              // Hide other routes
              if (
                mapInstance?.getLayer(
                  "workspace_network_analysis:mv_short_path_one_floor",
                )
              ) {
                mapInstance.setLayoutProperty(
                  "workspace_network_analysis:mv_short_path_one_floor",
                  "visibility",
                  "none",
                );
              }
              if (
                mapInstance?.getLayer(
                  "workspace_network_analysis:mv_short_path_g_floor",
                )
              ) {
                mapInstance.setLayoutProperty(
                  "workspace_network_analysis:mv_short_path_g_floor",
                  "visibility",
                  "none",
                );
              }
              if (mapInstance?.getLayer("route_layer")) {
                mapInstance.setLayoutProperty(
                  "route_layer",
                  "visibility",
                  "none",
                );
              }

              // Show matching route
              if (
                e.target.value === "0" &&
                mapInstance?.getLayer(
                  "workspace_network_analysis:mv_short_path_g_floor",
                )
              ) {
                const source = mapInstance.getSource(
                  "shortest_path_g_floor",
                ) as maplibregl.GeoJSONSource;
                // @ts-ignore
                if (source?._data?.features?.length > 0) {
                  mapInstance.setLayoutProperty(
                    "workspace_network_analysis:mv_short_path_g_floor",
                    "visibility",
                    "visible",
                  );
                }
              } else if (
                e.target.value === "1" &&
                mapInstance?.getLayer(
                  "workspace_network_analysis:mv_short_path_one_floor",
                )
              ) {
                const source = mapInstance.getSource(
                  "shortest_path_one_floor",
                ) as maplibregl.GeoJSONSource;
                // @ts-ignore
                if (source?._data?.features?.length > 0) {
                  mapInstance.setLayoutProperty(
                    "workspace_network_analysis:mv_short_path_one_floor",
                    "visibility",
                    "visible",
                  );
                }
              } else if (
                e.target.value === "CTU" &&
                mapInstance?.getLayer("route_layer")
              ) {
                const source = mapInstance.getSource(
                  "route",
                ) as maplibregl.GeoJSONSource;
                // @ts-ignore
                if (source?._data?.geometry?.coordinates?.length > 0) {
                  mapInstance.setLayoutProperty(
                    "route_layer",
                    "visibility",
                    "visible",
                  );
                }
              }
            }}
          >
            <option value="CTU">Khu II</option>
            <option value="0">Tầng G (DI)</option>
            <option value="1">Tầng 1 (DI)</option>
          </select>
          <button className="button_find_route bg-blue-500 text-[15px] font-bold text-white p-2.5 rounded-xl hover:bg-blue-700 cursor-pointer shadow-lg transition-colors">
            Find Route
          </button>
        </div>
        <Search
          name={buildingClicked?.name || "Tìm kiếm"}
          mapInstance={mapInstance}
          onShowResult={(show) => {
            if (show) {
              setShowMenuBar(false);
            }
          }}
          currentMarkers={currentMarkers}
          setCurrentMarkers={setCurrentMarkers}
          setCurrentPoints={setCurrentPoints}
        />
        <MapGeolocate
          mapInstance={mapInstance}
          onUserLocation={setUserLocation}
        />
        <G_Floor
          mapInstance={mapInstance}
          setNotificationInfo={setNotificationInfo}
          setShowNotification={setShowNotification}
          currentMarkers={currentMarkers}
          setCurrentMarkers={setCurrentMarkers}
          currentPoints={currentPoints}
          setCurrentPoints={setCurrentPoints}
        />
        <One_Floor
          mapInstance={mapInstance}
          setNotificationInfo={setNotificationInfo}
          setShowNotification={setShowNotification}
          currentMarkers={currentMarkers}
          setCurrentMarkers={setCurrentMarkers}
          currentPoints={currentPoints}
          setCurrentPoints={setCurrentPoints}
        />
      </div>
      <div className="menuBar-container">
        <MenuBar
          show={showMenuBar}
          onClose={() => setShowMenuBar(false)}
          building={buildingClicked as any}
          map={mapInstance}
          userLocation={userLocation}
          currentMarkers={currentMarkers}
          setCurrentMarkers={setCurrentMarkers}
          setCurrentPoints={setCurrentPoints}
        />
      </div>

      <div className="notification_side z-12 absolute top-15 le">
        {showNotification && Notification(notificationInfo)}
      </div>
    </div>
  );
}
