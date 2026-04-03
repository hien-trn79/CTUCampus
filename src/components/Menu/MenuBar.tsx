import { useEffect, useState } from "react";
import Seacrh from "./Search";

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
}

type buildingFetch = {
  id: number;
  name: string;
  src_bg: string;
  building: string;
  way_area: number;
};

export default function MenuBar({ show, onClose, building }: MenuBarProps) {
  const props = building?.properties;
  const [buildingClicked, setBuildingClicked] = useState<null | buildingFetch>(
    null,
  );
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
        console.log("Fetched building data:", buildingData);
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
          zIndex: 1000,
        }}
      >
        <Seacrh name={props?.name || "Tìm kiếm"} onClose={onClose} />
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

              <ul className="buildind_list">
                <li className="building_list--item">
                  Diện tích: {buildingClicked?.way_area || "N/A"} m²
                </li>
                <li className="building_list--item">
                  Building: {buildingClicked?.building || "N/A"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
