import React, { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";

export default function G_Floor({
  mapInstance,
}: {
  mapInstance: MapLibreMap | null;
}) {
  const [data, setData] = useState(null);

  const toggleLayer = (layerid: string, isVisible: boolean) => {
    if (mapInstance) {
      mapInstance.setLayoutProperty(
        layerid,
        "visibility",
        isVisible ? "visible" : "none",
      );
    }
  };

  // Fetch GeoJSON data
  useEffect(() => {
    if (!mapInstance) return;

    const fetchData = async () => {
      try {
        const response = await fetch(
          "/assets/CICT/demo/CICT_TangG_demo (1).geojson",
        );
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error("Error fetching GeoJSON data:", error);
      }
    };

    fetchData();
  }, [mapInstance]);

  // Set up map layers when data is available
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
          ["get", "Layer"],
          "wall",
          "#A0A095",
          "corridor",
          "#D3D3D3",
          "wc",
          "#448061",
          "room",
          "#85D1DB",
          "hangrao",
          "#FF634A",
          "sanco",
          "#8DD691",
          "hoca",
          "#57B9FF",
          "stair",
          "#FECB00",
          "#ccc",
        ],
        "fill-extrusion-height": [
          "match",
          ["get", "Layer"],
          "wall",
          4,
          "stair",
          1,
          "hangrao",
          1.5,
          "sanco",
          0.8,
          0.2,
        ],
        "fill-extrusion-base": 0.2,
        "fill-extrusion-opacity": 1,
      },
    });

    // addlayer highways

    mapInstance.on("load", () => {
      mapInstance.addSource("highways_cict_g_floor", {
        type: "raster",
        tiles: [
          "http://localhost:8080/geoserver/workspace_network_analysis/wms?" +
            "service=WMS&" +
            "version=1.1.1&" +
            "request=GetMap&" +
            "layers=workspace_network_analysis:highway_cict_g_floor&" +
            "bbox={bbox-epsg-3857}&" + // Biến động để MapLibre tự tính toán tọa độ
            "width=256&" +
            "height=256&" +
            "srs=EPSG:3857&" +
            "format=image/png&" +
            "transparent=true&" +
            "styles=",
        ],
        tileSize: 256,
      });

      mapInstance.addLayer({
        id: "workspace_network_analysis:highway_cict_g_floor",
        type: "raster",
        source: "highways_cict_g_floor",
        layout: {
          visibility: "none",
        },
      });

      // layer shortest path
      mapInstance.addSource("shortest_path_g_floor", {
        type: "raster",
        tiles: [
          "http://localhost:8080/geoserver/workspace_network_analysis/wms?" +
            "service=WMS&" +
            "version=1.1.1&" +
            "request=GetMap&" +
            "layers=workspace_network_analysis:mv_short_path_g_floor&" +
            "bbox={bbox-epsg-3857}&" + // Thay tọa độ tĩnh bằng biến động
            "width=256&" +
            "height=256&" +
            "srs=EPSG:3857&" + // Chuyển sang 3857 để khớp với bản đồ web
            "format=image/png&" +
            "transparent=true&" + // Quan trọng để thấy đường đi trên nền map
            "styles=",
        ],
        tileSize: 256,
      });

      mapInstance.addLayer({
        id: "workspace_network_analysis:mv_short_path_g_floor",
        type: "raster",
        source: "shortest_path_g_floor",
        layout: {
          visibility: "none",
        },
      });

      // handler maker cho layer => edit mode logic
      let isEditing = false;
      let startPoint: maplibregl.Marker | null = null;
      let endPoint: maplibregl.Marker | null = null;
      let markers: maplibregl.Marker[] = [];
      const editButton = document.querySelector(".button_find_route");
      editButton?.addEventListener("click", () => {
        if (!isEditing) {
          isEditing = true;
          startPoint = null;
          endPoint = null;

          clearMarkers();

          editButton.textContent = "Submit Route";
          editButton.classList.add("active");

          alert("Click on the map to select start and end points for routing.");
        } else {
          if (startPoint && endPoint) {
            fetch("http://localhost:5001/api/update_path", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                start: startPoint.getLngLat(),
                end: endPoint.getLngLat(),
                level: 0, // có thể thay đổi theo tầng hiện tại
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("Path updated:", data);
                // chinh sua lai param cho source layer wms
                if (!mapInstance) return;

                const sourceId = "shortest_path_g_floor";
                const layerId =
                  "workspace_network_analysis:mv_short_path_g_floor";

                if (mapInstance.getLayer(layerId)) {
                  mapInstance.removeLayer(layerId);
                }

                if (mapInstance.getSource(sourceId)) {
                  mapInstance.removeSource(sourceId);
                }

                mapInstance.addSource(sourceId, {
                  type: "raster",
                  tiles: [
                    "http://localhost:8080/geoserver/workspace_network_analysis/wms?" +
                      "service=WMS&" +
                      "version=1.1.1&" +
                      "request=GetMap&" +
                      "layers=workspace_network_analysis:mv_short_path_g_floor&" +
                      "bbox={bbox-epsg-3857}&" + // Thay tọa độ tĩnh bằng biến động
                      "width=256&" +
                      "height=256&" +
                      "srs=EPSG:3857&" + // Chuyển sang 3857 để khớp với bản đồ web
                      "format=image/png&" +
                      "transparent=true&" + // Quan trọng để thấy đường đi trên nền map
                      "styles=" +
                      "&_ts=" +
                      Date.now(), // them vao param timestamp de tranh cache
                  ],
                  tileSize: 256,
                });

                mapInstance.addLayer({
                  id: layerId,
                  type: "raster",
                  source: sourceId,
                  layout: {
                    visibility: "visible",
                  },
                });
              });
          } else {
            alert("Please select both start and end points.");
          }

          isEditing = false;
          editButton.textContent = "Find Route";
          editButton.classList.remove("active");
        }
      });
      mapInstance?.on("click", "di_g_floor_layer", (event) => {
        if (!isEditing) return;

        if (!startPoint) {
          startPoint = new maplibregl.Marker({ color: "green" })
            .setLngLat(event.lngLat)
            .setPopup(new maplibregl.Popup().setHTML("Start Point"))
            .addTo(mapInstance);
          markers.push(startPoint);
        } else if (!endPoint) {
          endPoint = new maplibregl.Marker({ color: "red" })
            .setLngLat(event.lngLat)
            .setPopup(new maplibregl.Popup().setHTML("End Point"))
            .addTo(mapInstance);
          markers.push(endPoint);
        } else {
          alert(
            "da san sang start va end point, vui long submit hoac clear truoc khi chon lai",
          );
        }
      });

      const clearMarkers = () => {
        markers.forEach((marker) => marker.remove());
        markers = [];
      };
    });
  }, [mapInstance, data]);

  return (
    <div className="g_floor">
      <button className="button_find_route absolute bottom-15 right-5 z-10 bg-blue-500 text-[15px] font-bold text-white p-2.5 rounded-xl hover:bg-blue-700">
        Find Route
      </button>
      <div className="layer-control z-10 absolute top-15 right-2 bg-white rounded-2xl shadow flex flex-col gap-2">
        <div className="layer-control_header h-[40px] flex items-center justify-center bg-blue-500 ">
          <h3 className="text-lg font-bold text-white">Layer Control</h3>
        </div>
        <div className="list_control p-3">
          <label className="flex items-center layer-control_item--label">
            <input
              type="checkbox"
              className="layer-control_input mr-2"
              defaultChecked={false}
              onChange={(e) =>
                toggleLayer(
                  "workspace_network_analysis:mv_short_path_g_floor",
                  e.target.checked,
                )
              }
            />
            Shortest Path Layer
          </label>
          <label className="flex items-center layer-control_item--label">
            <input
              type="checkbox"
              className="layer-control_input mr-2"
              defaultChecked={false}
              onChange={(e) =>
                toggleLayer(
                  "workspace_network_analysis:highway_cict_g_floor",
                  e.target.checked,
                )
              }
            />
            G Floor Layer
          </label>
        </div>
      </div>
    </div>
  );
}
