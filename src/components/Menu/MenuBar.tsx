import { useEffect, useState } from "react";
import MenuBarItem from "./MenuBarItem";
import ShowOptionRoute from "./OptionRoute";

interface MenuBarProps {
  show: boolean;
  onClose: () => void;
  building: {
    id: number;
    properties: {
      id: number;
      building: string;
      name: string;
      "name:vi": string;
      "@id": string;
    };
    source: string;
    geometry: {
      type: string;
      coordinates: number[] | number[][] | number[][][];
    };
  };
  map: maplibregl.Map | null;
}

type buildingFetch = {
  id: number;
  name: string;
  src_bg: string;
  building: string;
  way_area: number;
  website: string;
  introduce: string;
  address: string;
};

export default function MenuBar({
  map,
  show,
  onClose,
  building,
  userLocation,
}: MenuBarProps & { userLocation?: [number, number] | null }) {
  const props = building?.properties;
  const [buildingClicked, setBuildingClicked] = useState<null | buildingFetch>(
    null,
  );
  const [showRouteOption, setShowRouteOption] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (props) {
        const typeBuildingID = props.id.toString().split("/").slice(-2, -1)[0];
        let buildingID = Number(props.id.toString().split("/").pop());
        if (typeBuildingID === "relation") buildingID = buildingID * -1;

        async function fetchBuildingByID(id: number | string) {
          const response = await fetch(
            `http://localhost:3000/api/ctuII/building/${id}`,
          );
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const data = await response.json();
          return data;
        }

        const buildingData = await fetchBuildingByID(buildingID);
        setBuildingClicked(buildingData);
      }
    };

    fetchData();
  }, [props]);
  return (
    <>
      <div
        className="menuBar min-h-screen fixed top-0 left-0 bottom-0 bg-white shadow-lg"
        style={{
          display: show ? "block" : "none",
          animation: show ? "fadeIn 0.3s linear" : "fadeOut 0.3s linear",
          zIndex: 10,
        }}
      >
        <div
          className="closeSidebar cursor-pointer right-0 absolute text-white top-0"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        {/* Menu content goes here */}
        <div className="menuBar-content">
          <div className="menubar-body">
            <img
              src={
                buildingClicked?.src_bg ||
                "https://res.cloudinary.com/dw7aqqwti/image/upload/v1774972815/CongDaiHocCanTho_honmoc.jpg"
              }
              alt=""
              className="building_bg--primary"
            />
            <div className="menubar-content_infor p-2">
              <h3 className="building_name text-2xl font-bold py-5 ">
                {props?.name}{" "}
              </h3>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded findRoute-button"
                onClick={() => {
                  setShowRouteOption(true);
                }}
              >
                <i className="fa-solid fa-diamond-turn-right"></i>
                Tìm đường đi
              </button>
            </div>
            <ul className="buildind_list">
              <MenuBarItem
                label="Diện tích"
                value={buildingClicked?.way_area || "N/A"}
                icon="fa-solid fa-chart-area"
              />
              <MenuBarItem
                label="Loại công trình"
                value={buildingClicked?.building || "N/A"}
                icon="fa-solid fa-building"
              />
              <MenuBarItem
                label="Website"
                value={buildingClicked?.website || "N/A"}
                icon="fa-brands fa-chrome"
              />
              <MenuBarItem
                label="Địa chỉ"
                value={buildingClicked?.address || "N/A"}
                icon="fa-solid fa-map-marker-alt"
              />
              <li className="building_list--item introduce">
                <i className="fa-solid fa-info menuBar-icon"></i>
                <label htmlFor="" className="menuBar_item-label">
                  Giới thiệu
                </label>
                <p className="menuBar_item-content">
                  {buildingClicked?.introduce || "N/A"}
                </p>
              </li>
            </ul>
          </div>
        </div>
        {showRouteOption && (
          <ShowOptionRoute
            building={buildingClicked as buildingFetch}
            setShow={setShowRouteOption}
            map={map}
            buildingFeature={building}
            userLocation={userLocation}
          />
        )}
      </div>
    </>
  );
}
