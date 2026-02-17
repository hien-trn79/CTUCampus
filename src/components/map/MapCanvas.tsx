import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import { DivIcon, Icon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

export default function MapCanvas() {
  const position = { lat: 10.03214, lng: 105.76763 };

  const customIcon = new Icon({
    iconUrl: "icons/location_icon.png",
    iconSize: [38, 38],
    iconAnchor: [12, 41],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createClusterCustomIcon = (cluster: any) => {
    return new DivIcon({
      html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
      className:
        "custom-marker-cluster bg-blue-600 text-white rounded-full flex items-center flex-end text-center",
      iconSize: [30, 30],
    });
  };

  const markers = [
    {
      geocode: [10.03214, 105.76763],
      popup: "Can Tho University",
    },
    {
      geocode: [10.030951, 105.769053],
      popup: "Information Technology & Communication Department",
    },
  ];

  return (
    <MapContainer
      center={position}
      zoom={17}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
      >
        {markers.map((maker) => {
          return (
            <Marker
              position={maker.geocode as [number, number]}
              icon={customIcon}
            >
              <Popup>{maker.popup}</Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
