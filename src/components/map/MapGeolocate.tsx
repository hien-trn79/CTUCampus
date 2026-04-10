import maplibregl, { GeolocateControl } from "maplibre-gl";
import { useEffect, useRef } from "react";
import * as GEOLIB from "geolib";

interface MapControlProps {
  mapInstance: maplibregl.Map | null;
  onUserLocation?: (pos: [number, number]) => void;
}
export default function MapControl({ mapInstance, onUserLocation }: MapControlProps) {
  const map = mapInstance;
  const centerPosition = useRef([0, 0]);

  useEffect(() => {
    let geolocate = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });

    if (map) {
      // Them 1 nut control - dinh vi
      map.addControl(geolocate);

      geolocate.on("geolocate", (event) => {
        // toa do vi do va kinh do cua nguoi dung
        const { longitude, latitude } = event.coords;
        const userPosition = [longitude, latitude] as [number, number];
        if (onUserLocation) {
          onUserLocation(userPosition);
        }
      });

      // update toa do trung tam khi nguoi dung thay doi vi tri
      map.on("move", () => {
        centerPosition.current = [map.getCenter().lng, map.getCenter().lat];
      });
    }

    return () => {
      if (map && geolocate && map?.hasControl(geolocate)) {
        try {
          map.removeControl(geolocate);
        } catch (error) {
          console.error("Error removing geolocate control:", error);
        }
      }
    };
  }, [map]);
  return <div className="map_geolocate"></div>;
}
