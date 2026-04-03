import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";

export default function G_Floor({
  mapInstance,
}: {
  mapInstance: maplibregl.Map | null;
}) {
  const [data, setData] = useState(null);
  const [networkData, setNetworkData] = useState<FeatureCollection | null>(
    null,
  );

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
  }, [mapInstance, data]);

  // phan danh them marker
  useEffect(() => {
    if (!data || !mapInstance) return;

    const setupMarker = async () => {
      try {
        // ✅ load image đúng cách
        const result = await mapInstance.loadImage("/icons/marker-red.jpg");
        mapInstance.addImage("marker-red", result.data);

        if (!mapInstance.hasImage("marker-red")) {
          mapInstance.addImage("marker-red", result.data);
        }

        // ✅ thêm source nếu chưa có
        if (!mapInstance.getSource("marker_di_one_floor")) {
          mapInstance.addSource("marker_di_one_floor", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          });

          mapInstance.addLayer({
            id: "marker_di_one_floor_layer",
            type: "symbol",
            source: "marker_di_one_floor",
            layout: {
              "icon-image": "marker-red",
              "icon-size": 0.2,
              "icon-anchor": "bottom",
              "icon-allow-overlap": true,
            },
          });
        }

        // ✅ click
        mapInstance.on("click", "di_one_floor_layer", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const newPoint: Feature<Point> = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [e.lngLat.lng, e.lngLat.lat],
            },
            properties: {},
          } as const;

          (
            mapInstance.getSource(
              "marker_di_one_floor",
            ) as maplibregl.GeoJSONSource
          ).setData({
            type: "FeatureCollection",
            features: [newPoint],
          });
        });
      } catch (error) {
        console.error("Error loading marker:", error);
      }
    };

    setupMarker();
  }, [mapInstance, data]);

  return (
    <div className="one_floor">
      <h1>One Floor of CICT</h1>
    </div>
  );
}
