import * as GEOLIB from "geolib";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      zoom: 18,
      center: [105.769053, 10.030951],
      pitch: 60,
      canvasContextAttributes: { antialias: true },
    });

    const modelOrigin: [number, number] = [105.769053, 10.030951];
    const modelAltitude = 0;
    const modelRotate = [Math.PI / 2, 0, 0];

    const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude,
    );

    const modelTransform = {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z ?? 0,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
    };

    const camera = new THREE.Camera();
    const scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer;

    const customLayer = {
      id: "3d-model",
      type: "custom",
      renderingMode: "3d",

      onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl, // ⭐ Bắt buộc
          antialias: true,
        });
        renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 30);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;

        const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 200);
        pointLight1.position.set(30, 40, 20);

        const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 200);
        pointLight2.position.set(-30, 40, -20);

        scene.add(ambientLight, dirLight, pointLight1, pointLight2);

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
          options: {
            curveSegments: number;
            depth: number;
            bevelEnabled: boolean;
          },
        ) => {
          let geometry = new THREE.ExtrudeGeometry(shape, options);
          geometry.computeBoundingBox();

          return geometry;
        };

        const addBuilding = (
          element: Array<[number, number]>,
          height: number,
        ) => {
          let shape = genShape(element, modelOrigin);

          // Tạo geometry SAU KHI đã thêm hết tất cả các điểm
          let geometry = genGeometry(shape, {
            curveSegments: 1,
            depth: 0.02 * (height || 10),
            bevelEnabled: false,
          });

          let material = new THREE.MeshPhongMaterial({ color: 0xffffff });

          let mesh = new THREE.Mesh(geometry, material);
          mesh.rotateX(-Math.PI / 2);
          mesh.scale.set(100, 100, 100);
          scene.add(mesh);
        };

        // getGeoJSON
        const getGeoJSON = async () => {
          await fetch("./assets/map_demo(1).geojson").then((res) => {
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
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(gl: WebGLRenderingContext, args: any) {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          modelTransform.rotateX,
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          modelTransform.rotateY,
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          modelTransform.rotateZ,
        );

        const matrix = args.defaultProjectionData?.mainMatrix ?? args;
        const m = new THREE.Matrix4().fromArray(matrix);

        const l = new THREE.Matrix4()
          .makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ,
          )
          .scale(
            new THREE.Vector3(
              modelTransform.scale,
              -modelTransform.scale,
              modelTransform.scale,
            ),
          )
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

        camera.projectionMatrix = m.multiply(l);
        renderer.resetState();
        renderer.render(scene, camera);
      },
    } as maplibregl.CustomLayerInterface;

    map.on("style.load", () => {
      map.addLayer(customLayer);
    });

    return () => {
      map.remove();
      renderer?.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      id="map"
      ref={mapContainer}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
