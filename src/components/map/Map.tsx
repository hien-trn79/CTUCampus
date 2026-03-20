import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import MapGeolocate from "./MapGeolocate";
import G_Floor from "../buildings/DI/floors/G_Floor";
import One_Floor from "../buildings/DI/floors/One_Floor";

import MenuBar from "../Menu/MenuBar";

import { center } from "@turf/center";

export default function Map() {
  const [showMenuBar, setShowMenuBar] = useState(false);
  const showMenuBarRef = useRef(showMenuBar);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  const [dataCanTho, setDataCanTho] = useState(null);

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
      pitch: 60,
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
    });

    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 25,
    });

    const currentMarkers_layerCTU: maplibregl.Marker[] = [];
    const currentPoints_layerCTU: [number, number][] = [];

    map.on("click", "khu_ii_dhct_layer", (e) => {
      const props = e.features?.[0].properties;
      const features = e.features?.[0];
      if (!props || !features) return;
      const centerPoint = center(features);

      if (currentPoints_layerCTU.length === 2) {
        currentPoints_layerCTU.length = 0;
        currentMarkers_layerCTU.forEach((m) => m.remove());
        currentMarkers_layerCTU.length = 0;
      }

      const marker = new maplibregl.Marker({ color: "red" })
        .setLngLat(centerPoint.geometry.coordinates as [number, number])
        .addTo(map);

      currentMarkers_layerCTU.push(marker);
      currentPoints_layerCTU.push(
        centerPoint.geometry.coordinates as [number, number],
      );

      if (currentPoints_layerCTU.length === 2) {
        getRoute(currentPoints_layerCTU[0], currentPoints_layerCTU[1], map);
      }

      const markerElement = marker.getElement();
      markerElement.addEventListener("mouseenter", () => {
        const lngLat = marker.getLngLat();
        hoverPopup
          .setLngLat(lngLat)
          .setText(props["name"] || "Khu II")
          .addTo(map);
      });
      markerElement.addEventListener("mouseleave", () => {
        hoverPopup.remove();
      });

      markerElement.addEventListener("click", (e) => {
        e.stopPropagation(); // Ngăn sự kiện click lan ra map
        setShowMenuBar(true);
      });
    });

    // Click vào vị trí bất kỳ ngoài tòa nhà
    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["khu_ii_dhct_layer"],
      });

      // Nếu click trúng layer thì bỏ qua, đã xử lý ở trên
      if (features.length > 0) return;

      if (currentPoints_layerCTU.length === 2) {
        currentPoints_layerCTU.length = 0;
        currentMarkers_layerCTU.forEach((m) => m.remove());
        currentMarkers_layerCTU.length = 0;
      }

      const lngLat = e.lngLat;
      const coords: [number, number] = [lngLat.lng, lngLat.lat];

      const marker = new maplibregl.Marker({ color: "blue" })
        .setLngLat(coords)
        .addTo(map);

      currentMarkers_layerCTU.push(marker);
      currentPoints_layerCTU.push(coords);

      if (currentPoints_layerCTU.length === 2) {
        getRoute(currentPoints_layerCTU[0], currentPoints_layerCTU[1], map);
      }

      // dong menu bar
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
      currentMarkers_layerCTU.forEach((m) => m.remove());
      map.remove();
    };
  }, [setShowMenuBar]);

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
        <MapGeolocate mapInstance={mapInstance} />
        <G_Floor mapInstance={mapInstance} />
        <One_Floor mapInstance={mapInstance} />
      </div>
      <div className="menuBar-container">
        <MenuBar show={showMenuBar} onClose={() => setShowMenuBar(false)} />
      </div>
    </div>
  );
}
