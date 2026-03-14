import * as GEOLIB from "geolib";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: "https://tiles.openfreemap.org/styles/bright",
      zoom: 18,
      center: [105.769053, 10.030951],
      pitch: 60,
      canvasContextAttributes: { antialias: true },
    });

    setMapInstance(map);

    return () => {
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
        id: "ku_ii_dhct_layer",
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
