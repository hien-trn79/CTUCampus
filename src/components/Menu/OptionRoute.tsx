/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { center } from "@turf/center";
import bbox from "@turf/bbox";

interface OptionRouteProps {
  setShow: (show: boolean) => void;
  building: {
    id: number;
    name: string;
    src_bg: string;
    building: string;
    way_area: number;
    website: string;
    introduce: string;
    address: string;
  };
  buildingFeature?: any;
  userLocation?: [number, number] | null;
  map: maplibregl.Map | null;
}

export default function showOptionRoute({
  setShow,
  building,
  buildingFeature,
  userLocation,
  map,
}: OptionRouteProps) {
  const onClose = () => {
    // Logic to close the option route
    setShow(false);
  };

  const [startInput, setStartInput] = useState<string>("");
  const [endInputSearch, setEndInputSearch] = useState<string>("");

  // ham tim duong
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
      if (!json.routes || json.routes.length === 0) return null;
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
      return route;
    } catch (error) {
      console.error("Error fetching route:", error);
      return null;
    }
  };

  // State for suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeInput, setActiveInput] = useState<"start" | "end" | null>(null);

  // ham dung de dong suggestion khi click ben ngoai
  const onCloseSuggestions = () => {
    setShowSuggestions(false);
    setActiveInput(null);
  };

  // bat su kien click ben ngoai de dong suggestion khi nguoi dung click ra ngoai o input
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".optionRoute-input_list")) {
      onCloseSuggestions();
    }
  };

  // xử lý sự kiện click bên ngoài để đóng gợi ý tìm kiếm
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // neu dang bat geolocation thi se tu dong dien vao o diem xuat phat
  useEffect(() => {
    if (userLocation) {
      setStartInput("Vị trí của bạn");
    }
    // Neu da co building duoc chon thi tu dong dien vao o diem den
    if (building) {
      setEndInputSearch(building.name || "");
    }
  }, [userLocation, building]);

  // Xử lý phần gợi ý tìm kiếm
  useEffect(() => {
    const fetchSuggestions = async (queryStr: string) => {
      const query = queryStr.trim();
      // Nếu người dùng bật vị trí cá nhân
      if (!query || query === "Vị trí của bạn") {
        setSuggestions([]);
        return;
      }

      // danh sách các địa điểm phù hợp
      let localMatches: any[] = [];
      if (map) {
        // Nếu có map, tìm kiếm trong khu II
        const source = map.getSource("khu_ii_dhct") as any;
        if (source && source._data && source._data.features) {
          localMatches = source._data.features
            // lọc theo tên địa điểm có chứa chuỗi tìm kiếm (không phân biệt hoa thường)
            .filter((f: any) =>
              f.properties?.name?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((f: any) => ({
              display_name: f.properties.name + " (Trường ĐH Cần Thơ)",
              lat: center(f).geometry.coordinates[1],
              lon: center(f).geometry.coordinates[0],
            }))
            .slice(0, 3); // Lấy tối đa 3 kết quả nội khu
        }
      }

      try {
        // tìm tự động các địa điểm bất kỳ
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            query,
          )}&limit=5&lat=10.03&lon=105.77`,
        );

        // kết quả tìm kiếm
        const data = await res.json();
        const apiMatches = data.features.map((f: any) => {
          const p = f.properties;
          // Gộp các trường địa chỉ lại thành một chuỗi duy nhất, loại bỏ trùng lặp
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

        // Gộp kết quả
        setSuggestions([...localMatches, ...apiMatches]);
      } catch (error) {
        console.error("Geocoding API error:", error);
        setSuggestions(localMatches);
      }
    };

    const currentQuery =
      activeInput === "start"
        ? startInput
        : activeInput === "end"
          ? endInputSearch
          : "";

    // cài đặt thời gian chờ để tránh gọi API quá nhiều khi người dùng gõ liên tục
    const timeoutId = setTimeout(() => {
      if (activeInput) fetchSuggestions(currentQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [startInput, endInputSearch, activeInput, map]);

  // Hàm xử lý khi người dùng nhấn nút tìm đường
  const handleRouteSearch = async () => {
    if (!map) return;

    let startCoords: [number, number] | null = null;
    let startStr = startInput.trim();

    // kiem tra co bat geolocation va nguoi dung chon dung vi tri ca nhan hay khong
    if (startStr === "Vị trí của bạn" && userLocation) {
      startCoords = userLocation;
    } else {
      // Tìm tòa nhà theo tên trong Source nội khu trước
      const source = map.getSource("khu_ii_dhct") as any;
      if (source && source._data && source._data.features) {
        const features = source._data.features;
        const matchingFeature = features.find(
          (f: any) =>
            f.properties?.name
              ?.toLowerCase()
              .includes(startStr.toLowerCase()) ||
            f.properties?.name + " (Trường ĐH Cần Thơ)" === startStr,
        );
        // Nếu tìm thấy, lấy tọa độ trung tâm của tòa nhà đó
        if (matchingFeature) {
          const pt = center(matchingFeature);
          startCoords = pt.geometry.coordinates as [number, number];
        }
      }

      // Nếu không tìm thấy trong format nội khu, dùng Photon (như Google API) để tìm điểm bất kỳ
      if (!startCoords) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(startStr)}&limit=1&lat=10.03&lon=105.77`,
          );
          const photonData = await photonRes.json();
          if (photonData.features && photonData.features.length > 0) {
            const coords = photonData.features[0].geometry.coordinates;
            startCoords = [coords[0], coords[1]];
          }
        } catch (error) {
          console.error("Geocoding API error:", error);
        }
      }
    }

    if (!startCoords) {
      alert("Không tìm thấy vị trí bắt đầu trên bản đồ!");
      return;
    }

    let endStr = endInputSearch.trim();
    if (!endStr) return;

    // Kiểm tra tồn tại của phòng (e.g. 101/DI or just room number if building known)
    let isRoomSearch = false;
    const parts = endStr.split("/");
    isRoomSearch = parts.length > 1 || /^\d+$/.test(endStr); // Nếu có dấu "/" hoặc chỉ là số, coi như đang tìm kiếm phòng

    if (isRoomSearch) {
      // tách phần số phòng và mã tòa nhà (nếu có)
      const roomNumber = parts[0];

      // phan nay hien thi ky hieu toa nha
      const buildingID = parts[1] || "";

      try {
        // gọi chức năng tìm kiếm phòng từ pgRouting đã xây dựng
        const response = await fetch(
          `http://localhost:5001/api/search?room=${roomNumber}&buildingID=${buildingID}`,
        );
        const data = await response.json();
        const targetNode = data?.targetNode;

        // tao ra 1 khoi tru nho hinh tron de hien thi dich
        const createCirclePolygon = (lng: number, lat: number) => {
          const points = 32;
          const radius = 0.000015; // Tăng bán kính lên một chút để dễ nhìn hơn
          const coords = [];
          for (let i = 0; i < points; i++) {
            const angle = ((i * 360) / points) * (Math.PI / 180);
            coords.push([
              lng + radius * Math.cos(angle),
              lat + radius * Math.sin(angle),
            ]);
          }
          coords.push(coords[0]);
          return [coords];
        };

        if (!data || data.error) {
          alert("Lỗi tìm kiếm: " + (data?.error || "Không thấy kết quả"));
          return;
        }

        if (data.data) {
          // Cập nhật route nội bộ cho tòa nhà nếu có dữ liệu trả về
          const sourceG = map.getSource(
            "shortest_path_g_floor",
          ) as maplibregl.GeoJSONSource;
          const source1 = map.getSource(
            "shortest_path_one_floor",
          ) as maplibregl.GeoJSONSource;

          const featuresG = data.data.features.filter(
            (f: any) => f.properties.floor === "G",
          );
          const features1 = data.data.features.filter(
            (f: any) => f.properties.floor === "1",
          );

          if (sourceG)
            sourceG.setData({ type: "FeatureCollection", features: featuresG });
          if (source1)
            source1.setData({ type: "FeatureCollection", features: features1 });

          if (data.targetFloor === 0) {
            map.setLayoutProperty(
              "workspace_network_analysis:mv_short_path_g_floor",
              "visibility",
              "visible",
            );
            map.setLayoutProperty(
              "workspace_network_analysis:mv_short_path_one_floor",
              "visibility",
              "none",
            );
          } else if (data.targetFloor === 1) {
            map.setLayoutProperty(
              "workspace_network_analysis:mv_short_path_g_floor",
              "visibility",
              "visible",
            );
            map.setLayoutProperty(
              "workspace_network_analysis:mv_short_path_one_floor",
              "visibility",
              "visible",
            );
          }
          // Đối với lộ trình bên ngoài, sẽ dẫn đến cửa chính của tòa nhà (hardcoded Entrance of CNTT [105.769098, 10.031102] theo mặc định của API)
          // Outdoor routing -> route to entrance of the building (hardcoded Entrance of CNTT [105.769098, 10.031102] according to api default)
          const entranceCoords: [number, number] = [105.768927, 10.03084]; // Cua chinh cua tang 1 CICT
          const routeGeoJSON = await getRoute(startCoords, entranceCoords, map);

          if (map.getLayer("route_layer")) {
            map.setLayoutProperty("route_layer", "visibility", "visible");
          }

          if (routeGeoJSON) {
            const routeBbox = bbox({
              type: "Feature",
              geometry: routeGeoJSON,
              properties: {},
            });
            map.fitBounds(routeBbox as [number, number, number, number], {
              padding: { top: 50, bottom: 50, left: 50, right: 350 }, // add padding specifically to offset the menu on the right
              duration: 1000,
            });
          } else {
            map.easeTo({ center: entranceCoords, zoom: 12, duration: 1000 });
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Mặc định tìm kiếm theo tên tòa nhà như trước đây
      let endCoords: [number, number] | null = null;
      if (buildingFeature && endStr === building?.name) {
        const pt = center(buildingFeature);
        endCoords = pt.geometry.coordinates as [number, number];
      } else {
        const source = map.getSource("khu_ii_dhct") as any;
        if (source && source._data && source._data.features) {
          const features = source._data.features;
          const matchingFeature = features.find(
            (f: any) =>
              f.properties?.name
                ?.toLowerCase()
                .includes(endStr.toLowerCase()) ||
              f.properties?.name + " (Trường ĐH Cần Thơ)" === endStr,
          );
          if (matchingFeature) {
            const pt = center(matchingFeature);
            endCoords = pt.geometry.coordinates as [number, number];
          }
        }
      }

      // Nếu không tìm thấy trong format nội khu, dùng Photon (như Google API) để tìm điểm bất kỳ
      if (!endCoords) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(endStr)}&limit=1&lat=10.03&lon=105.77`,
          );
          const photonData = await photonRes.json();
          if (photonData.features && photonData.features.length > 0) {
            const coords = photonData.features[0].geometry.coordinates;
            endCoords = [coords[0], coords[1]];
          }
        } catch (error) {
          console.error("Geocoding API error:", error);
        }
      }

      if (!endCoords) {
        alert("Không tìm thấy vị trí đến!");
        return;
      }

      // Tìm lộ trình từ điểm bắt đầu đến điểm kết thúc
      const routeGeoJSON = await getRoute(startCoords, endCoords, map);
      if (map.getLayer("route_layer")) {
        map.setLayoutProperty("route_layer", "visibility", "visible");
      }

      // Phóng to bản đồ để hiển thị toàn bộ lộ trình
      //bbox la mot boundingbox xung quanh route. Co nghia la lo trinh se duoc bao boc boi 1 cai hop => Dam bao toan bo lo trinh duoc hien thi tren ban do, khong bi cat bo phan nao
      if (routeGeoJSON) {
        const routeBbox = bbox({
          type: "Feature",
          geometry: routeGeoJSON,
          properties: {},
        });
        map.fitBounds(routeBbox as [number, number, number, number], {
          padding: { top: 50, bottom: 50, left: 50, right: 350 }, // Padding for the visual menu
          duration: 1000,
        });
      } else {
        map.easeTo({ zoom: 9, duration: 1000 });
      }
    }

    setShow(false);

    return {};
  };

  return (
    <div className="showOptionRoute ">
      <div
        className="OptionClose cursor-pointer right-2 absolute top-2"
        onClick={onClose}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <h2 className="optionRoute-header text-blue-500 font-bold text-xl">
        Tùy chọn lộ trình
      </h2>
      <div className="optionRoute-input_list relative">
        <div className="routeStart routeSide relative z-20">
          <i className="fa-regular fa-circle routeStart-icon"></i>
          <input
            type="text"
            className="routeStart-input form-control"
            placeholder="Điểm xuất phát"
            autoFocus
            value={startInput}
            onFocus={() => {
              setActiveInput("start");
              setShowSuggestions(true);
            }}
            onChange={(e) => {
              setStartInput(e.target.value);
              setActiveInput("start");
              setShowSuggestions(true);
            }}
          />
          {showSuggestions &&
            activeInput === "start" &&
            suggestions.length > 0 && (
              <ul className="absolute top-12 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((item, id) => (
                  <li
                    key={id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 text-sm"
                    onClick={() => {
                      setStartInput(item.display_name);
                      setShowSuggestions(false);
                      setActiveInput(null);
                    }}
                  >
                    {item.display_name}
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="routeEnd routeSide mt-4">
          <i className="fa-solid fa-location-dot text-red-500 routeEnd-icon"></i>
          <input
            type="text"
            className="routeEnd-input form-control"
            placeholder="Điểm đến"
            value={endInputSearch}
            onFocus={() => {
              setActiveInput("end");
              setShowSuggestions(true);
            }}
            onChange={(e) => {
              setEndInputSearch(e.target.value);
              setActiveInput("end");
              setShowSuggestions(true);
            }}
          />
          {showSuggestions &&
            activeInput === "end" &&
            suggestions.length > 0 && (
              <ul className="absolute top-30 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((item, id) => (
                  <li
                    key={id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 text-sm"
                    onClick={() => {
                      setEndInputSearch(item.display_name);
                      setShowSuggestions(false);
                      setActiveInput(null);
                    }}
                  >
                    {item.display_name}
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="button_submitFind">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-4 rounded submitFindRoute "
            onClick={handleRouteSearch}
          >
            Tìm đường đi
          </button>
        </div>
      </div>
    </div>
  );
}
