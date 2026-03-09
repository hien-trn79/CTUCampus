import { useEffect, useState } from "react";
export default function G_Floor({
  mapInstance,
}: {
  mapInstance: maplibregl.Map | null;
}) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!mapInstance) return;

    const fetchData = async () => {
      try {
        const response = await fetch("/assets/CICT/indoor_cntt_(4).geojson");
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error("Error fetching GeoJSON data:", error);
      }
    };

    fetchData();
  }, [mapInstance]);

  useEffect(() => {
    if (!data || !mapInstance) return;
    mapInstance.addSource("di_g_floor", {
      type: "geojson",
      data: data,
    });

    mapInstance.addLayer({
      id: "di_g_floor_layer",
      type: "fill-extrusion",
      source: "di_g_floor",
      paint: {
        "fill-extrusion-color": [
          "match",
          ["get", "category"],
          "room",
          "#ff0000",
          "office",
          "#00ff00",
          "library",
          "#ccc",
          "#ccc",
        ],
        "fill-extrusion-height": [
          "match",
          ["get", "category"],
          "room",
          2,
          "office",
          2,
          "library",
          2,
          0.5,
        ],
        "fill-extrusion-base": 0.3,
        "fill-extrusion-opacity": 1,
      },
    });
  }, [mapInstance, data]);

  return (
    <div className="g_floor">
      <h1>G Floor of CICT</h1>
    </div>
  );
}
