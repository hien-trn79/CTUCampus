import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import MapGeolocate from "./MapGeolocate";
import G_Floor from "../buildings/DI/floors/G_Floor";
import One_Floor from "../buildings/DI/floors/One_Floor";

export default function Map() {
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
      const query = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`,
      );
      const json = await query.json();
      if (!json.routes || json.routes.length === 0) return;
      const data = json.routes[0];
      const route = data.geometry;

      const source = mapObj.getSource("route") as maplibregl.GeoJSONSource;
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

    let currentMarkers: maplibregl.Marker[] = [];
    let currentPoints: [number, number][] = [];

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const coords = [e.lngLat.lng, e.lngLat.lat] as [number, number];

      // Nếu đã có 2 điểm thì reset để chọn lại từ đầu
      if (currentPoints.length === 2) {
        currentPoints = [];
        currentMarkers.forEach((m) => m.remove());
        currentMarkers = [];

        const source = map.getSource("route") as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          });
        }
      }

      currentPoints.push(coords);
      const marker = new maplibregl.Marker().setLngLat(coords).addTo(map);
      currentMarkers.push(marker);

      if (currentPoints.length === 2) {
        getRoute(currentPoints[0], currentPoints[1], map);
      }
    };

    map.on("click", handleMapClick);

    setMapInstance(map);

    return () => {
      map.off("click", handleMapClick);
      currentMarkers.forEach((m) => m.remove());
      map.remove();
    };
  }, []);

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

      const startPoint = [105.769053, 10.030951] as [number, number];
      const endPoint = [105.772, 10.035] as [number, number];

      mapInstance.addLayer({
        id: "route_layer",
        type: "line",
        source: "route",
        paint: {
          "line-color": "blue",
          "line-width": 5,
          "line-opacity": 0.8,
        },
      });

      getRoute(startPoint, endPoint);
    });
  }, [dataCanTho, mapInstance]);

  return (
    <div
      id="map"
      ref={mapContainer}
      style={{ width: "100vw", height: "100vh" }}
    >
      <MapGeolocate mapInstance={mapInstance} />
      <G_Floor mapInstance={mapInstance} />
      <One_Floor mapInstance={mapInstance} />
    </div>
  );
}
