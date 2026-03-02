import * as GEOLIB from "geolib";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import MapGeolocate from "./MapGeolocate";

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

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

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    const rayCamera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer;

    // common function to calculate relative position
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

      // Chuyen tu toa do cuc ve toa do decartes
      let x = dis * Math.sin((bearing * Math.PI) / 180);
      let y = dis * Math.cos((bearing * Math.PI) / 180);

      return [x, y];
    };

    const GPSRelativePosition2 = (
      objPosi: [number, number],
      centerPosi: [number, number],
    ) => {
      // Convert sang MercatorCoordinate
      const objMerc = maplibregl.MercatorCoordinate.fromLngLat(objPosi);
      const centerMerc = maplibregl.MercatorCoordinate.fromLngLat(centerPosi);

      // Tính chênh lệch trong hệ Mercator
      const dx = objMerc.x - centerMerc.x;
      const dy = objMerc.y - centerMerc.y;

      // Đổi sang đơn vị meter tương thích với scale bạn đang dùng
      const meterScale = centerMerc.meterInMercatorCoordinateUnits();

      const x = dx / meterScale;
      const y = dy / meterScale;

      return [x, y];
    };

    const customLayer = {
      id: "3d-model",
      type: "custom",
      renderingMode: "3d",

      onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });
        renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Chinh anh sang
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

        // render shape
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

        const genShape2 = (polygon: Array<[number, number]>) => {
          const shape = new THREE.Shape();
          polygon.forEach((point, index) => {
            const merc = maplibregl.MercatorCoordinate.fromLngLat(point);
            if (index === 0) {
              shape.moveTo(merc.x, merc.y);
            } else {
              shape.lineTo(merc.x, merc.y);
            }
          });
          return shape;
        };

        // render geometry
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: { [key: string]: any },
        ) => {
          let shape = genShape(element, modelOrigin);

          // Tính centroid lng/lat của polygon (bỏ điểm cuối nếu trùng điểm đầu)
          const ring =
            element[0][0] === element[element.length - 1][0] &&
            element[0][1] === element[element.length - 1][1]
              ? element.slice(0, -1)
              : element;
          const centroidLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          const centroidLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;

          // Tạo geometry SAU KHI đã thêm hết tất cả các điểm
          let geometry = genGeometry(shape, {
            curveSegments: 1,
            depth: 2 * height || 15,
            bevelEnabled: false,
          });

          let material = new THREE.MeshPhongMaterial({ color: 0xffffff });

          let mesh = new THREE.Mesh(geometry, material);
          mesh.userData = {
            id: properties["@id"] || null,
            name: properties["name"] || "Unknown Building",
            centroid: [centroidLng, centroidLat] as [number, number],
          };

          mesh.rotateX(-Math.PI / 2);
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
                    if (feature.geometry.type === "Polygon") {
                      const outerRing = feature.geometry.coordinates[0];
                      addBuilding(
                        outerRing,
                        feature.properties["height"],
                        feature.properties,
                      );
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

        getGeoJSON();
      },
      // thiet lap ban do bang MapLibre GL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(gl, args) {
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

        const m = new THREE.Matrix4().fromArray(
          args.defaultProjectionData.mainMatrix,
        );
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

        // 1 camera phu de raycast
        rayCamera.projectionMatrix.copy(camera.projectionMatrix);
        // rayCamera.projectionMatrix.fromArray(
        //   args.defaultProjectionData.mainMatrix,
        // );

        rayCamera.matrixWorld.identity();
        rayCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);

        renderer.resetState();
        renderer.render(scene, camera);
        map.triggerRepaint();
      },
    } as maplibregl.CustomLayerInterface;

    map.on("style.load", () => {
      map.addLayer(customLayer);
    });

    map.on("resize", () => {
      map.triggerRepaint();
    });

    const raycaster = new THREE.Raycaster();
    let currentMarker: maplibregl.Marker | null = null;
    let selectedMesh: THREE.Mesh | null = null;

    map.on("mousedown", (event) => {
      const x = event.point.x;
      const y = event.point.y;

      // event.point đã là tọa độ relative với canvas, KHÔNG trừ rect.left/top
      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const normalizedX = (x / rect.width) * 2 - 1;
      const normalizedY = -(y / rect.height) * 2 + 1;

      // camera.projectionMatrix = MVP (model + view + projection) nên KHÔNG dùng
      // setFromCamera vì nó giả định camera.position là vị trí thực (mặc định (0,0,0)).
      // Thay vào đó, unproject 2 điểm NDC (near & far) qua inverse MVP để tính ray đúng.
      const invMVP = camera.projectionMatrix.clone().invert();

      const ndcNear = new THREE.Vector3(
        normalizedX,
        normalizedY,
        -1,
      ).applyMatrix4(invMVP);
      const ndcFar = new THREE.Vector3(
        normalizedX,
        normalizedY,
        1,
      ).applyMatrix4(invMVP);

      const direction = ndcFar.clone().sub(ndcNear).normalize();
      raycaster.ray.set(ndcNear, direction);

      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;

        // Reset màu mesh cũ
        if (selectedMesh && selectedMesh !== hit) {
          (selectedMesh.material as THREE.MeshPhongMaterial).color.set(
            0xffffff,
          );
        }

        // Highlight mesh mới
        (hit.material as THREE.MeshPhongMaterial).color.set(0xff6600);
        selectedMesh = hit;

        // Xóa marker cũ
        currentMarker?.remove();

        // Đặt marker tại centroid của toà nhà
        const centroid = hit.userData.centroid as [number, number] | undefined;
        if (centroid) {
          const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>${hit.userData.name}</strong>`,
          );
          currentMarker = new maplibregl.Marker({ color: "#ff6600" })
            .setLngLat(centroid)
            .setPopup(popup)
            .addTo(map);
          currentMarker.togglePopup();
        }
      }
    });

    setMapInstance(map);

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
    >
      <MapGeolocate mapInstance={mapInstance} />
    </div>
  );
}
