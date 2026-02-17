import { useEffect } from "react";
import * as THREE from "three";
import MapCanvas from "./components/map/MapCanvas";
import { MapControls } from "three/addons/controls/MapControls.js";
import { MenuBar } from "./components/MenuBar";
import * as GEOLIB from "geolib";
import type { GeolibInputCoordinates } from "geolib/es/types";
import type { latLng } from "leaflet";
import { cos } from "three/tsl";

function App() {
  // Xu ly phan threeJS
  useEffect(() => {
    const map = document.querySelector(".mapCanvas");
    const centerPos = [105.769053, 10.030951] as [number, number]; // Vi tri trung tam de tinh toan khoang cach dia ly

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(8, 4, 0);

    const light0 = new THREE.AmbientLight(0xfafafa, 0.6);
    // const light1 = new THREE.PointLight(0xfafafa, 0.4);
    // light1.position.set(100, 90, 40);
    // const light2 = new THREE.PointLight(0xfafafa, 0.4);
    // light2.position.set(100, 90, -40);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 30);
    dirLight.castShadow = true; // Bật shadow

    // Shadow settings => Lam mờ cạnh shadow và tăng chất lượng shadow
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.mapSize.width = 2048; // Độ phân giải shadow
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;

    const pointLight1 = new THREE.PointLight(0xffd700, 0.3, 200);
    pointLight1.position.set(30, 40, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4169e1, 0.3, 200);
    pointLight2.position.set(-30, 40, -20);
    scene.add(pointLight2);

    scene.add(light0, dirLight, pointLight1, pointLight2);

    const girdHelper = new THREE.GridHelper(
      60,
      150,
      new THREE.Color(0x555555),
      new THREE.Color(0x333333),
    );
    scene.add(girdHelper);

    const renderer = new THREE.WebGLRenderer({
      canvas: map as HTMLCanvasElement,
    });

    renderer.shadowMap.enabled = true; // Bật shadow map
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Loại shadow map

    const control = new MapControls(camera, renderer.domElement);
    control.enableDamping = true;
    control.enableZoom = true;
    control.zoomSpeed = 10;
    control.maxDistance = 800;
    control.dampingFactor = 0.25;

    const renderLoop = () => {
      control.update();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };

    const genShape = (
      points: Array<[number, number]>,
      center: [number, number],
    ) => {
      let shape = new THREE.Shape();
      for (let i = 0; i < points.length; i++) {
        let elp = points[i];
        let relativePos = GPSRelativePosition(elp, center);
        if (i === 0) {
          shape.moveTo(relativePos[0], relativePos[1]);
        } else {
          shape.lineTo(relativePos[0], relativePos[1]);
        }
      }

      return shape;
    };

    const genGeometry = (
      shape: THREE.Shape,
      options: { curveSegments: number; depth: number; bevelEnabled: boolean },
    ) => {
      let geometry = new THREE.ExtrudeGeometry(shape, options);
      geometry.computeBoundingBox();

      return geometry;
    };

    const addBuilding = (element: Array<[number, number]>, height: number) => {
      let shape = genShape(element, centerPos);

      // Tạo geometry SAU KHI đã thêm hết tất cả các điểm
      let geometry = genGeometry(shape, {
        curveSegments: 1,
        depth: 0.05 * (height || 10),
        bevelEnabled: false,
      });

      let material = new THREE.MeshPhongMaterial({ color: 0xffffff });

      let mesh = new THREE.Mesh(geometry, material);
      mesh.rotateX(-Math.PI / 2);
      scene.add(mesh);
    };

    // getGeoJSON
    const getGeoJSON = async () => {
      await fetch("./assets/export.geojson").then((res) => {
        res
          .json()
          .then((data) => {
            let features = data.features;
            for (let i = 0; i < features.length; i++) {
              let feature = features[i];

              if (!feature["properties"]) return;
              if (feature.properties["building"]) {
                let coordinates = feature.geometry.coordinates;
                for (let i = 0; i < coordinates.length; i++) {
                  let element = coordinates[i];
                  addBuilding(element, feature.properties["height"]);
                }
              }
            }
          })
          .catch((error) => {
            console.error("Error parsing JSON:", error);
          });
      });
    };

    // GeoJSON format: [longitude, latitude]
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

    getGeoJSON();
    renderLoop();
  }, []);

  return (
    <>
      <canvas className="mapCanvas bg-blue-50">
        {/* <MenuBar /> */}
        {/* <MapCanvas /> */}
      </canvas>
    </>
  );
}

export default App;
