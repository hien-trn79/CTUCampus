/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { center } from "@turf/center";

interface SearchProps {
  name: string;
  mapInstance?: maplibregl.Map | null;
  onShowResult?: (show: boolean) => void;
  currentMarkers: maplibregl.Marker[];
  setCurrentMarkers: (markers: maplibregl.Marker[]) => void;
  setCurrentPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

export default function Search({
  name,
  mapInstance,
  onShowResult,
  currentMarkers,
  setCurrentMarkers,
  setCurrentPoints,
}: SearchProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [isShowResult, setIsShowResult] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [searchMode, setSearchMode] = useState<"room" | "place">("room");
  const [placeInfo, setPlaceInfo] = useState<{ name: string; address: string }>(
    { name: "", address: "" },
  );
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const cleanMarkers = () => {
    currentMarkers.forEach((marker) => console.log(marker));
  };

  // Trang thai cho xu ly autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle autocomplete fetch
  useEffect(() => {
    const fetchSuggestions = async () => {
      const query = inputValue.trim();
      if (!query) {
        setSuggestions([]);
        return;
      }

      let localMatches: any[] = [];
      if (mapInstance) {
        const source = mapInstance.getSource("khu_ii_dhct") as any;
        if (source && source._data && source._data.features) {
          localMatches = source._data.features
            .filter((f: any) =>
              f.properties?.name?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((f: any) => ({
              display_name: f.properties.name + " (Trường ĐH Cần Thơ)",
              lat: center(f).geometry.coordinates[1],
              lon: center(f).geometry.coordinates[0],
            }))
            .slice(0, 3);
        }
      }

      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            query,
          )}&limit=5&lat=10.03&lon=105.77`,
        );
        const data = await res.json();
        const apiMatches = data.features.map((f: any) => {
          const p = f.properties;
          const parts = [
            p.name,
            p.street,
            p.district,
            p.city || p.state,
          ].filter(Boolean);
          const uniqueParts = Array.from(new Set(parts));
          return {
            display_name: uniqueParts.join(", "),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          };
        });

        setSuggestions([...localMatches, ...apiMatches]);
      } catch (error) {
        console.error("Geocoding API error:", error);
        setSuggestions(localMatches);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, mapInstance]);

  // Hàm xử lý tắt result
  const attachAutoHide = () => {
    const btnFindRoute = document.querySelector(".button_find_route");

    if (!btnFindRoute) return;

    btnFindRoute.addEventListener("click", () => {
      setIsShowResult(false);
      onShowResult?.(false);
    });

    mapInstance?.on("click", "khu_ii_dhct_layer", () => {
      setIsShowResult(false);
      onShowResult?.(false);
    });
  };
  // Dieu chinh zoom de hien thi duong di tot hon
  function getZoomAdjustment(oldLatitude: number, newLatitude: number) {
    return Math.log2(
      Math.cos((newLatitude / 180) * Math.PI) /
        Math.cos((oldLatitude / 180) * Math.PI),
    );
  }

  // Xu ly su kien khi nguoi dung nhap vao o tim kiem
  const submitSearch = async () => {
    // Clear marker cũ nếu có
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Kiểm tra xem input có giống một phòng học hoặc tòa nhà không (có chứa số hoặc '/')
    const isRoomType = trimmedInput.includes("/") || /^\d+$/.test(trimmedInput);

    if (isRoomType) {
      const roomNumber = trimmedInput.split("/")[0];
      const buildingID = trimmedInput.split("/")[1] || "";

      try {
        const response = await fetch(
          `http://localhost:5001/api/search?room=${roomNumber}&buildingID=${buildingID}`,
        );
        const dataSearch = await response.json();

        if (dataSearch && !dataSearch.error && dataSearch.data) {
          setData(dataSearch);
          setSearchMode("room");

          if (mapInstance) {
            setTotalDistance(dataSearch.totalDistance);

            // set data for both floors
            const sourceG = mapInstance.getSource(
              "shortest_path_g_floor",
            ) as maplibregl.GeoJSONSource;
            const source1 = mapInstance.getSource(
              "shortest_path_one_floor",
            ) as maplibregl.GeoJSONSource;

            // filter features for each floor
            const featuresG = dataSearch.data.features.filter(
              (f: any) => f.properties.floor === "G",
            );
            const features1 = dataSearch.data.features.filter(
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
            if (dataSearch.targetFloor === 0) {
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
            } else if (dataSearch.targetFloor === 1) {
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
            const center: [number, number] = [105.769098, 10.031102];
            const mapZoom = mapInstance.getZoom();
            const delta =
              (zoomIn ? 1.5 : -1.5) + getZoomAdjustment(center[1], 10);

            const zoom = 18.999999;
            mapInstance.easeTo({ center, zoom, duration: 1000 });

            setIsShowResult(true);
            onShowResult?.(true);
            cleanMarkers();
            attachAutoHide();
            return;
          }
        }
      } catch (err) {
        console.error("Local search err:", err);
      }
    }

    // NẾU TÌM BẰNG API CỤC BỘ KHÔNG RA -> TÌM TRÊN BẢN ĐỒ THẾ GIỚI BẰNG PHOTON
    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmedInput)}&limit=1&lat=10.03&lon=105.77`,
      );
      const photonData = await photonRes.json();

      if (photonData.features && photonData.features.length > 0) {
        const feature = photonData.features[0];
        const p = feature.properties;
        const coords = feature.geometry.coordinates as [number, number]; // [lon, lat]

        const parts = [p.name, p.street, p.district, p.city || p.state].filter(
          Boolean,
        );
        const uniqueParts = Array.from(new Set(parts));

        const displayName =
          uniqueParts[0] || p.name || "Địa điểm chưa xác định";
        const displayAddress =
          uniqueParts.slice(1).join(", ") || (p.name ? uniqueParts[0] : "");

        if (mapInstance) {
          // Thêm marker mới
          markerRef.current = new maplibregl.Marker({ color: "#FF0000" })
            .setLngLat(coords)
            .addTo(mapInstance);

          mapInstance.easeTo({ center: coords, zoom: 17, duration: 1000 });
        }

        setSearchMode("place");
        setPlaceInfo({ name: displayName, address: displayAddress });
        setIsShowResult(true);
        onShowResult?.(true);
        attachAutoHide();
        return;
      }
    } catch (err) {
      console.error("Geocoding API error:", err);
    }

    alert(
      "Không tìm thấy địa điểm hoặc phòng. Vui lòng thử lại với từ khóa khác!",
    );
    setIsShowResult(false);
    onShowResult?.(false);
  };

  return (
    <div className="search_sidebar relative">
      <div className="search custom_search z-11">
        <i
          className="fa-solid fa-magnifying-glass search-icon cursor-pointer"
          onClick={submitSearch}
        ></i>
        <input
          type="text"
          className="search--input w-full"
          placeholder={name}
          value={inputValue}
          onFocus={() => setShowSuggestions(true)}
          onChange={(event) => {
            setInputValue(event.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setShowSuggestions(false);
              submitSearch();
            }
          }}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute suggestion_search top-14 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto z-50">
          {suggestions.map((item, id) => (
            <li
              key={id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 suggestion_search--item"
              onClick={() => {
                setInputValue(item.display_name);
                setShowSuggestions(false);
                // Optionally auto-submit after choosing suggestion
                // submitSearch();
              }}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}

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
              {searchMode === "room" ? (
                <>
                  <h3 className="startPoint font-bold text-lg mb-2">
                    <i className="fa-regular fa-circle routeStart-icon mr-1"></i>
                    Điểm bắt đầu:
                    <span className="startPoint_value value ml-2">
                      Lối đi chính trường CNTT
                    </span>
                  </h3>
                  <h3 className="startPoint font-bold text-lg mb-2">
                    Tầng bắt đầu:
                    <span className="startPoint_value value ml-2">
                      Tầng trệt
                    </span>
                  </h3>
                  <h3 className="endPoint font-bold text-lg mb-2">
                    <i className="fa-solid fa-location-dot text-red-500 routeEnd-icon mr-1"></i>
                    Điểm kết thúc:
                    <span className="endPoint_value value ml-2">
                      Phòng {inputValue}
                    </span>
                  </h3>
                  <h3 className="endPoint font-bold text-lg mb-2">
                    Tầng kết thúc:{" "}
                    <span className="endPoint_value value ml-2">
                      Phòng {inputValue}
                    </span>
                  </h3>
                  <h3 className="distance font-bold text-lg mb-2">
                    Tổng khoảng cách:{" "}
                    <span className="distance_value value ml-2">
                      {totalDistance.toFixed(2)}
                    </span>{" "}
                    mét
                  </h3>
                </>
              ) : (
                <>
                  <h3 className="startPoint font-bold text-lg mb-2 flex">
                    <i className="fa-solid fa-location-dot text-red-500 routeEnd-icon mr-2 mt-1"></i>
                    <div>
                      <span className="block text-gray-500 text-sm">
                        Tên địa điểm:
                      </span>
                      <span className="startPoint_value value text-blue-600">
                        {placeInfo.name}
                      </span>
                    </div>
                  </h3>
                  {placeInfo.address && (
                    <h3 className="distance font-bold text-lg mb-2 mt-4 flex">
                      <i className="fa-solid fa-map-location-dot text-gray-500 mr-2 mt-1"></i>
                      <div>
                        <span className="block text-gray-500 text-sm">
                          Địa chỉ:
                        </span>
                        <span className="distance_value value text-gray-700">
                          {placeInfo.address}
                        </span>
                      </div>
                    </h3>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
