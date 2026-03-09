import maplibregl, { GeolocateControl } from "maplibre-gl";
import { useEffect, useRef } from "react";
import * as GEOLIB from "geolib";

interface MapControlProps {
  mapInstance: maplibregl.Map | null;
}
export default function MapControl({ mapInstance }: MapControlProps) {
  const map = mapInstance;
  const centerPosition = useRef([0, 0]);

  // GeoJSON format: [longitude, latitude] => chuyen toa do tu Mercartor -> GPS
  const GPSRelativePosition = (
    objPosi: [number, number],
    centerPosi: [number, number],
  ) => {
    // Chuyển từ GeoJSON [lon, lat] sang format geolib cần {lat, lon}
    const objGeolib = { latitude: objPosi[1], longitude: objPosi[0] };
    const centerGeolib = {
      latitude: centerPosi[1],
      longitude: centerPosi[0],
    };

    const dis = GEOLIB.getDistance(objGeolib, centerGeolib);
    const bearing = GEOLIB.getRhumbLineBearing(centerGeolib, objGeolib);

    // Tính toán vị trí tương đối dựa trên khoảng cách và hướng
    let x = dis * Math.sin((bearing * Math.PI) / 180);
    let y = dis * Math.cos((bearing * Math.PI) / 180);

    return [x / 100, y / 100];
  };

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
