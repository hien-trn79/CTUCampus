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
        const response = await fetch("/assets/CICT/demo/CICT_wall_(4).geojson");
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

  return (
    <div className="one_floor">
      <h1>One Floor of CICT</h1>
    </div>
  );
}
