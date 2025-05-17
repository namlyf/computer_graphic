import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//-------------------------initial-----------------------------
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}
const trackRadius = 200;
const trackWidth = 35;
const innerTrackRadius = trackRadius - trackWidth;
const outerTrackRadius = trackRadius + trackWidth;

const trackRadius2 = 340;
const trackWidth2 = 40;
const outerTrackRadius2 = trackRadius2 + trackWidth2;
const innerTrackRadius2 = trackRadius2 - trackWidth2;

// Tree location
const arcAngle1 = (1 / 3) * Math.PI;
const deltaY = Math.sin(arcAngle1) * innerTrackRadius;
const arcAngle2 = Math.asin(deltaY / outerTrackRadius);

const arcCenterX =
  (Math.cos(arcAngle1) * innerTrackRadius +
    Math.cos(arcAngle2) * outerTrackRadius) / 2;


const vehicleColors = [
  0xa52523,
  0xef2d56,
  0x0ad3ff,
  0xff9f1c,
  0xa52523, 0xbdb638, 0x78b14b,
];
const lawnGreen = "#67C240";
const trackColor = "#546E90";
const edgeColor = "#725F48";
const treeCrownColor = 0x498c2c;
const treeTrunkColor = 0x4b3f2f;
const wheelGeometry = new THREE.CylinderGeometry(7.5, 7.5, 35, 32);
const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const treeTrunkGeometry = new THREE.BoxGeometry(15, 15, 50);
const treeTrunkMaterial = new THREE.MeshLambertMaterial({
  color: treeTrunkColor
});
const treeCrownMaterial = new THREE.MeshLambertMaterial({
  color: treeCrownColor
});

const config = {
  shadows: true, // Use shadow
  trees: true, // Add trees to the map
  curbs: true, // Show texture on the extruded geometry
};

const wheelGeometry1 = new THREE.CylinderGeometry(7.5, 7.5, 37, 32);
const speed = 0.0007;

const playerAngleInitial = Math.PI;
let playerAngleMoved;
let playerAngleMoved1;
let lastTimestamp = null;
let isPaused = false;

//-------------------------------camere, light, scene,render-------------------
const scene = new THREE.Scene();


const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
if (config.shadows) renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);


// Camera
const aspectRatio = window.innerWidth / window.innerHeight;
const cameraWidth = 1450;
const cameraHeight = cameraWidth / aspectRatio;

const camera = new THREE.PerspectiveCamera(
  60,                // FOV - góc nhìn dọc (degrees)
  aspectRatio,       // tỉ lệ khung hình
  0.1,               // near clipping plane
  2000               // far clipping plane
);

camera.position.set(0, -650, 230);
camera.lookAt(0, 0, 0);
// const camera = new THREE.OrthographicCamera(
//   cameraWidth / -2,
//   cameraWidth / 2,
//   cameraHeight / 2,
//   cameraHeight / -2,
//   50,
//   700
// );
// camera.position.set(0,-150, 550);
// camera.lookAt(0, 0, 0);
const mapWidth = 1100;
const mapHeight = 1100;
renderMap(mapWidth, mapHeight);



//--------------------------Map------------------------
function getLineMarkings(mapWidth, mapHeight) {
  const scale = 2; // Tăng độ phân giải gấp 2 lần
  const canvas = document.createElement('canvas');
  canvas.width = mapWidth * scale;
  canvas.height = mapHeight * scale;
  const context = canvas.getContext('2d');

  // Scale lại để giữ tỷ lệ hình ảnh
  context.scale(scale, scale);

  // Fill nền
  context.fillStyle = '#546E90';
  context.fillRect(0, 0, mapWidth, mapHeight);

  // Đặt thuộc tính vẽ line
  context.lineWidth = 2;
  context.setLineDash([10, 14]);

  // Arc đầu tiên
  context.strokeStyle = '#E0FFFF';
  context.beginPath();
  context.arc(mapWidth / 2, mapHeight / 2, trackRadius, 0, Math.PI * 2);
  context.stroke();

  // Arc thứ hai
  context.strokeStyle = '#E0FFFF';
  context.beginPath();
  context.arc(mapWidth / 2, mapHeight / 2, trackRadius2, 0, Math.PI * 2);
  context.stroke();

  // Arc ranh giới
  context.setLineDash([]);
  context.strokeStyle = '#E0FFFF';
  context.beginPath();
  context.arc(mapWidth / 2, mapHeight / 2, innerTrackRadius2, 0, Math.PI * 2);
  context.stroke();

  // Arc ranh giới ngoài
  context.beginPath();
  context.arc(mapWidth / 2, mapHeight / 2, outerTrackRadius2, 0, Math.PI * 2);
  context.stroke();

  context.lineWidth = 3;
  context.strokeStyle = '#E0FFFF';
  context.beginPath();
  context.arc(
    mapWidth / 2,
    mapHeight / 2,
    outerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  context.beginPath();
  context.arc(
    mapWidth / 2,
    mapHeight / 2,
    innerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}


function getLeftIsland() {
  const islandLeft = new THREE.Shape();

  islandLeft.absarc(
    0,
    0,
    innerTrackRadius,
    0,
    2 * Math.PI,
  );


  islandLeft.absarc(
    0,
    0,
    innerTrackRadius2, // Bán kính ngoài lớn hơn
    0,
    Math.PI * 2,
    false
  );

  // Vẽ đường tròn trong theo chiều ngược lại để tạo vành khăn
  const hole = new THREE.Path();
  hole.absarc(
    0,
    0,
    outerTrackRadius, // Bán kính trong
    0,
    Math.PI * 2,
    true // Chiều ngược lại
  );
  islandLeft.holes.push(hole);
  return islandLeft;
}
function getOuterField(mapWidth, mapHeight) {
  const field = new THREE.Shape();

  // Tạo hình chữ nhật bao phủ toàn bộ map
  field.moveTo(-mapWidth / 2, -mapHeight / 2);
  field.lineTo(mapWidth / 2, -mapHeight / 2);
  field.lineTo(mapWidth / 2, mapHeight / 2);
  field.lineTo(-mapWidth / 2, mapHeight / 2);
  field.lineTo(-mapWidth / 2, -mapHeight / 2);

  // Đục lỗ vòng tròn lớn ngoài cùng
  const hole = new THREE.Path();
  hole.absarc(
    0,
    0,
    outerTrackRadius2,
    0,
    Math.PI * 2,
    true
  );
  field.holes.push(hole);

  return field;
}
function getBlueCircleLayer() {
  const shape = new THREE.Shape();

  shape.absarc(0, 0, innerTrackRadius - 10, 0, Math.PI * 2);

  const geometry = new THREE.ExtrudeGeometry([shape], {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 128,
    transparent: true,
    roughness: 0.8,
    metalness: 0.2,
    shadow: true

  });

  const material = new THREE.MeshLambertMaterial({ color: 0x00C0FF }); // xanh biển
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.2;
  return mesh;
}




function renderMap(mapWidth, mapHeight) {
  const lineMarkingsTexture = getLineMarkings(mapWidth, mapHeight);

  const planeGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
  const planeMaterial = new THREE.MeshLambertMaterial({ map: lineMarkingsTexture });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true; // nhận bóng
  plane.matrixAutoUpdate = false;
  scene.add(plane);

  // === VÙNG TRÒN BÊN TRONG - islandLeft ===
  const islandLeftShape = getLeftIsland();
  const islandLeftGeometry = new THREE.ExtrudeGeometry([islandLeftShape], {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 128
  });
  const islandLeftMesh = new THREE.Mesh(
    islandLeftGeometry,
    new THREE.MeshLambertMaterial({ color: 0x67c240 })
  );
  islandLeftMesh.receiveShadow = true; // nhận bóng

  scene.add(islandLeftMesh);

  // === VÙNG NGOÀI - outerField ===
  const outerFieldShape = getOuterField(mapWidth, mapHeight);
  const outerFieldGeometry = new THREE.ExtrudeGeometry([outerFieldShape], {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 128
  });
  const outerFieldMesh = new THREE.Mesh(
    outerFieldGeometry,
    new THREE.MeshLambertMaterial({ color: 0x67c240 })
  );
  outerFieldMesh.receiveShadow = true; // nhận bóng
  scene.add(outerFieldMesh);

  // Lớp xanh biển
  const blueLayer = getBlueCircleLayer();
  blueLayer.receiveShadow = true;
  scene.add(blueLayer);

  if (config.trees) {
    const tree1 = Tree();
    tree1.position.x = arcCenterX * 2;
    scene.add(tree1);

    const tree0 = Tree();
    tree0.position.x = -arcCenterX * 2;
    scene.add(tree0);


    const tree2 = Tree();
    tree2.position.y = arcCenterX * 1;
    tree2.position.x = arcCenterX * 1.9;
    scene.add(tree2);

    const tree3 = Tree();
    tree3.position.x = arcCenterX * 0.8;
    tree3.position.y = arcCenterX * 1.7;
    scene.add(tree3);

    const tree4 = Tree();
    tree4.position.x = arcCenterX * 1.8;
    tree4.position.y = arcCenterX * 2.5;
    scene.add(tree4);

    const tree5 = Tree();
    tree5.position.x = -arcCenterX * -0.2;
    tree5.position.y = arcCenterX * 2;
    scene.add(tree5);

    const tree6 = Tree();
    tree6.position.x = -arcCenterX * 2;
    tree6.position.y = arcCenterX * 2.3;
    scene.add(tree6);

    const tree7 = Tree();
    tree7.position.x = arcCenterX * 0.8;
    tree7.position.y = -arcCenterX * 2;
    scene.add(tree7);

    const tree8 = Tree();
    tree8.position.x = arcCenterX * 2.3;
    tree8.position.y = -arcCenterX * 2;
    scene.add(tree8);

    const tree9 = Tree();
    tree9.position.x = -arcCenterX * 1;
    tree9.position.y = -arcCenterX * 2;
    scene.add(tree9);

    const tree10 = Tree();
    tree10.position.x = -arcCenterX * 2.5;
    tree10.position.y = -arcCenterX * 1.8;
    scene.add(tree10);

    const tree11 = Tree();
    tree11.position.x = arcCenterX * 0.4;
    tree11.position.y = -arcCenterX * 2.1;
    scene.add(tree11);

    const tree12 = Tree();
    tree12.position.x = arcCenterX * 1.7;
    tree12.position.y = -arcCenterX * 2.4;
    scene.add(tree12);

    const tree13 = Tree();
    tree13.position.x = -arcCenterX * 1.7;
    tree13.position.y = -arcCenterX * 2.4;
    scene.add(tree13);

    const tree14 = PineTree();
    tree14.position.x = -arcCenterX * 1.5;
    tree14.position.y = -arcCenterX * 1.4;
    scene.add(tree14);

    const tree15 = PineTree();
    tree15.position.set(-30, -275, 0)
    scene.add(tree15);

    const tree16 = PineTree();
    tree16.position.set(-150, 210, 0)
    scene.add(tree16);

    const tree17 = PineTree();
    tree17.position.set(-415, 115, 0)
    scene.add(tree17);

    const tree18 = PineTree();
    tree18.position.set(225, -135, 0)
    scene.add(tree18);
    const tree19 = PineTree();
    tree19.position.set(280, -280, 0)
    scene.add(tree19);

    const tree20 = PineTree();
    tree20.position.set(-285, -345, 0)
    scene.add(tree20);

    const tree21 = PineTree();
    tree21.position.set(50, -405, 0)
    scene.add(tree21);

  }
}

function Tree() {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
  trunk.position.z = 10;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.matrixAutoUpdate = false;
  tree.add(trunk);

  const treeHeights = 65;
  const height = treeHeights;

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(height / 2, 30, 30),
    treeCrownMaterial
  );
  crown.position.z = height / 2 + 15;
  crown.castShadow = true;
  crown.receiveShadow = false;
  tree.add(crown);

  return tree;
}
function PineTree() {
  const tree = new THREE.Group();

  // Thân cây
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x8B4513 }) // màu nâu
  );
  trunk.position.y = 5;
  tree.add(trunk);

  // Tầng lá thứ 1 (dưới cùng)
  const leaf1 = new THREE.Mesh(
    new THREE.ConeGeometry(8, 12, 16),
    new THREE.MeshLambertMaterial({ color: 0x0b6623 }) // xanh lá
  );
  leaf1.position.y = 14;
  tree.add(leaf1);

  // Tầng lá thứ 2
  const leaf2 = new THREE.Mesh(
    new THREE.ConeGeometry(6, 10, 16),
    new THREE.MeshLambertMaterial({ color: 0x0b6623 })
  );
  leaf2.position.y = 20;
  tree.add(leaf2);

  // Tầng lá thứ 3 (trên cùng)
  const leaf3 = new THREE.Mesh(
    new THREE.ConeGeometry(4, 8, 16),
    new THREE.MeshLambertMaterial({ color: 0x0b6623 })
  );
  leaf3.position.y = 25;
  tree.add(leaf3);

  // Bật bóng đổ
  tree.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  tree.rotation.x = Math.PI / 2;
  tree.scale.set(4, 4, 4);
  return tree;
}



//-----------------------Car-------------------------
function getCarFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  context.fillStyle = "#000000";
  context.fillRect(8, 8, 48, 24);

  return new THREE.CanvasTexture(canvas);
}

function getCarSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 32);

  context.fillStyle = "#000000";
  context.fillRect(10, 8, 38, 24);
  context.fillRect(58, 8, 60, 24);

  return new THREE.CanvasTexture(canvas);
}

function Car() {
  const car = new THREE.Group();

  const color = pickRandom(vehicleColors);

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color: color })
  );
  main.position.z = 12;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);
  const denL = new THREE.Mesh(
    new THREE.SphereGeometry(5, 60, 64),
    new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
  );
  denL.position.set(28, -8, 10);
  car.add(denL);


  const denR = new THREE.Mesh(
    new THREE.SphereGeometry(5, 60, 64),
    new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
  );
  denR.position.set(28, 8, 10);
  car.add(denR);

  const carFrontTexture = getCarFrontTexture();
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  carFrontTexture.rotation = Math.PI / 2;

  const carBackTexture = getCarFrontTexture();
  carBackTexture.center = new THREE.Vector2(0.5, 0.5);
  carBackTexture.rotation = -Math.PI / 2;

  const carLeftSideTexture = getCarSideTexture();
  carLeftSideTexture.flipY = false;

  const carRightSideTexture = getCarSideTexture();

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(33, 24, 12), [
    new THREE.MeshLambertMaterial({ map: carFrontTexture }),
    new THREE.MeshLambertMaterial({ map: carBackTexture }),
    new THREE.MeshLambertMaterial({ map: carLeftSideTexture }),
    new THREE.MeshLambertMaterial({ map: carRightSideTexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // top
    new THREE.MeshLambertMaterial({ color: 0xffffff }) // bottom
  ]);
  cabin.position.x = -6;
  cabin.position.z = 25.5;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const backWheel = new Wheel();
  backWheel.position.x = -18;
  car.add(backWheel);

  const frontWheel = new Wheel();
  frontWheel.position.x = 18;
  car.add(frontWheel);

  return car;
}
function Wheel() {
  const wheel = new THREE.Mesh(wheelGeometry1, wheelMaterial);
  wheel.position.z = 6;
  wheel.castShadow = false;
  wheel.receiveShadow = false;
  return wheel;
}

// ---------------------------------------------- Truck -----------------------------------
function getCargotextrue() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  context.fillStyle = "#000000";
  context.font = "25px Arial";
  context.fillText("N", 25, 25);

  return new THREE.CanvasTexture(canvas);
}
function getCargotextrue2() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  context.fillStyle = "#000000";
  context.font = "20px Arial";
  context.fillText("T", 10, 25);

  return new THREE.CanvasTexture(canvas);
}
function getTruckFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 32, 32);

  context.fillStyle = "#000000";
  context.fillRect(0, 5, 32, 10);

  return new THREE.CanvasTexture(canvas);
}

function getTruckSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 32, 32);

  context.fillStyle = "#000000";
  context.fillRect(17, 5, 15, 10);

  return new THREE.CanvasTexture(canvas);
}

function Truck() {
  const truck = new THREE.Group();
  const color = pickRandom(vehicleColors);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(100, 25, 5),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc })
  );
  base.position.z = 10;
  truck.add(base);
  const cargotexture = getCargotextrue();
  cargotexture.center = new THREE.Vector2(0.5, 0.5);
  const cargotexture2 = getCargotextrue2();
  cargotexture2.center = new THREE.Vector2(0.5, 0.5);
  cargotexture2.rotation = -Math.PI / 2;


  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(75, 35, 40),
    [new THREE.MeshLambertMaterial({ color: 0xffffff }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: cargotexture2 }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: cargotexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff, map: cargotexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    new THREE.MeshLambertMaterial({ color: 0xffffff })

    ]);
  cargo.position.x = -15;
  cargo.position.z = 30;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const truckFrontTexture = getTruckFrontTexture();
  truckFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  truckFrontTexture.rotation = Math.PI / 2;

  const truckLeftTexture = getTruckSideTexture();
  truckLeftTexture.flipY = false;

  const truckRightTexture = getTruckSideTexture();

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(25, 30, 30), [
    new THREE.MeshLambertMaterial({ color, map: truckFrontTexture }),
    new THREE.MeshLambertMaterial({ color }), // back
    new THREE.MeshLambertMaterial({ color, map: truckLeftTexture }),
    new THREE.MeshLambertMaterial({ color, map: truckRightTexture }),
    new THREE.MeshLambertMaterial({ color }), // top
    new THREE.MeshLambertMaterial({ color }) // bottom
  ]);
  cabin.position.x = 40;
  cabin.position.z = 20;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const backWheel = Wheel();
  backWheel.position.x = -30;
  truck.add(backWheel);

  const middleWheel = Wheel();
  middleWheel.position.x = 10;
  truck.add(middleWheel);

  const frontWheel = Wheel();
  frontWheel.position.x = 38;
  truck.add(frontWheel);
  const denL = new THREE.Mesh(
    new THREE.SphereGeometry(6, 60, 64),
    new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
  );
  denL.position.set(50, -8, 12);
  truck.add(denL);


  const denR = new THREE.Mesh(
    new THREE.SphereGeometry(6, 60, 64),
    new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
  );
  denR.position.set(50, 8, 12);
  truck.add(denR);

  return truck;
}



// -----------------------------------------Ship------------------------------
function Duck() {
  const duck = new THREE.Group(); // Nhóm tất cả phần lại với nhau

  // Thân giữa
  const thangiua = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 50, 28),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  thangiua.position.set(0, 0, 0);
  duck.add(thangiua);

  // Thân trước
  const thantruoc = new THREE.Mesh(
    new THREE.SphereGeometry(20, 28, 28),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  thantruoc.position.set(0, 30, 0);
  duck.add(thantruoc);

  // Thân sau
  const thansau = new THREE.Mesh(
    new THREE.SphereGeometry(20, 28, 28),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  thansau.position.set(0, -30, 0);
  duck.add(thansau);

  // Cổ
  const co = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 40, 32),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  co.position.set(0, 30, 20);
  co.rotation.x = Math.PI / 2;
  duck.add(co);

  // Đầu
  const dau = new THREE.Mesh(
    new THREE.SphereGeometry(15, 32, 32),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  dau.position.set(0, 35, 40);
  dau.scale.set(1.1, 1.5, 1);
  dau.rotation.x = -Math.PI / 12;
  duck.add(dau);

  // Mắt phải
  const mat1 = new THREE.Mesh(
    new THREE.SphereGeometry(4, 32, 32),
    new THREE.MeshLambertMaterial({ color: 0x000000 })
  );
  mat1.position.set(7, 38, 52);
  duck.add(mat1);

  // Mắt trái
  const mat2 = new THREE.Mesh(
    new THREE.SphereGeometry(4, 32, 32),
    new THREE.MeshLambertMaterial({ color: 0x000000 })
  );
  mat2.position.set(-7, 38, 52);
  duck.add(mat2);

  // Mỏ
  const mo = new THREE.Mesh(
    new THREE.ConeGeometry(9, 15, 32),
    new THREE.MeshLambertMaterial({ color: 0xffa500 })
  );
  mo.position.set(0, 58, 43);
  mo.rotation.x = Math.PI / 8;
  duck.add(mo);

  return duck;
}

function createFlagTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');


  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);


  ctx.fillStyle = "#ffff00";
  drawStar(ctx, canvas.width / 2, canvas.height / 2, 5, 40, 15);


  return new THREE.CanvasTexture(canvas);
}


function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function ship() {
  const ship = new THREE.Group();

  // ----- Thân tàu (các khúc gỗ) -----
  const woodColor = new THREE.Color(0xDF6F06);
  const woodMaterial = new THREE.MeshLambertMaterial({
    color: woodColor,
    transparent: true,
    opacity: 0.8
  });

  const woodPositions = [0, 12, -12, 22, -22];
  woodPositions.forEach(x => {
    const wood = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 120, 32),
      woodMaterial.clone()
    );
    wood.position.x = x;
    wood.castShadow = true;
    wood.receiveShadow = true;
    ship.add(wood);
  });

  // ----- Cột cờ -----
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 50, 32),
    new THREE.MeshStandardMaterial({ color: 0x8B5A2B })
  );
  pole.position.z = 25;
  pole.rotation.x = Math.PI / 2;
  pole.castShadow = true;
  ship.add(pole);

  // ----- Lá cờ -----
  const flagGeometry = new THREE.PlaneGeometry(20, 10);
  const flagMaterial = new THREE.MeshStandardMaterial({
    map: createFlagTexture(),
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(10, 0, 45);
  flag.rotation.x = Math.PI / 2;
  flag.castShadow = true;
  ship.add(flag);

  return ship;
}

// Tạo tàu
// function ship() {
//   const ship = new THREE.Group();

//   const wood1 = new THREE.Mesh(
//     new THREE.CylinderGeometry(7, 7, 120, 32),
//     new THREE.MeshLambertMaterial({ 
//       color: 0xDF6F06, 
//       roughness: 0.8,
//       opacity: 0.8 
//     })
//   );
//   wood1.castShadow = true;
//   wood1.receiveShadow = true;
//   ship.add(wood1);
//   const wood2 = new THREE.Mesh(
//     new THREE.CylinderGeometry(5, 5, 120, 32),
//     new THREE.MeshLambertMaterial({ 
//       color: new THREE.Color(0xDF6F06), 
//       transparent: true,
//       opacity: 0.8 
//     })
//   );
//   wood2.position.x = 12;
//   wood2.castShadow = true;
//   wood2.receiveShadow = true;
//   ship.add(wood2);
//   const wood3 = new THREE.Mesh(
//     new THREE.CylinderGeometry(7, 7, 120, 32),
//     new THREE.MeshLambertMaterial({ 
//       color: new THREE.Color(0xDF6F06),
//       transparent: true,
//       opacity: 0.8 
//     })
//   );
//   wood3.position.x = -12;
//   wood3.castShadow = true;
//   wood3.receiveShadow = true;
//   ship.add(wood3);

//   const wood4 = new THREE.Mesh(
//     new THREE.CylinderGeometry(7, 7, 120, 32),
//     new THREE.MeshLambertMaterial({ 
//       color: new THREE.Color(0xDF6F06),
//       transparent: true,
//       opacity: 0.8 
//     })
//   );
//   wood4.position.x = 22;
//   wood4.castShadow = true;
//   wood4.receiveShadow = true;
//   ship.add(wood4);

//   const wood5 = new THREE.Mesh(
//     new THREE.CylinderGeometry(7, 7, 120, 32),
//     new THREE.MeshLambertMaterial({ 
//       color: new THREE.Color(0xDF6F06), 
//       transparent: true,
//       opacity: 0.8 
//     })
//   );
//   wood5.position.x = -22;
//   wood5.castShadow = true;
//   wood5.receiveShadow = true;
//   ship.add(wood5);


// const flagGeometry = new THREE.PlaneGeometry(20, 10);
// const flagMaterial = new THREE.MeshStandardMaterial({ 
//     map: createFlagTexture(), 
//     side: THREE.DoubleSide 
// });
// const flag = new THREE.Mesh(flagGeometry, flagMaterial);
// flag.position.set(10,0, 45);
// flag.rotation.x = Math.PI / 2;  
// ship.add(flag);


// const pole = new THREE.Mesh(
//     new THREE.CylinderGeometry(1, 1, 50, 32),
//     new THREE.MeshStandardMaterial({ color: 0x8B5A2B })
// );
// pole.position.z = 25;
// pole.rotation.x = Math.PI / 2;
// ship.add(pole);

//   return ship;

// }
//----------------------------Model------------------------------

function enableShadowForObject(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}
let model, model1, model2, model3, model4, model5, model6, model7, model8, model9,model10;
const loader = new GLTFLoader();


// Load model 1
loader.load('model/Lily pad.glb', function (gltf) {
  model10 = gltf.scene;
  model10.scale.set(3, 3, 3);
  model10.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  model10.position.set(60, 0, 0);
  enableShadowForObject(model10);
  scene.add(model10);
});
loader.load('model/Water lilies.glb', function (gltf) {
  model9 = gltf.scene;
  model9.scale.set(3, 3, 3);
  model9.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  model9.position.set(-80, -50, 2);
  enableShadowForObject(model9);
  scene.add(model9);
});

loader.load('model/Crane.glb', function (gltf) {
  model1 = gltf.scene;
  model1.scale.set(17, 17, 17);
  model1.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  model1.position.set(-235, 120, 0);
  enableShadowForObject(model1);
  scene.add(model1);
});
loader.load('model/Crane.glb', function (gltf) {
  model = gltf.scene;
  model.scale.set(17, 17, 17);
  model.rotation.set(Math.PI / 2, 0, 0);
  model.position.set(-420, 70, 0);
  enableShadowForObject(model);
  scene.add(model);
});
loader.load('model/Building_1.glb', function (gltf) {
  model4 = gltf.scene;
  model4.scale.set(100, 100, 100);
  model4.rotation.set(Math.PI / 2, -Math.PI / 2, 0);
  model4.position.set(-450, -150, 0);
  enableShadowForObject(model4);
  scene.add(model4);
});

loader.load('model/Building_2.glb', function (gltf) {
  model5 = gltf.scene;
  model5.scale.set(100, 100, 100);
  model5.rotation.set(Math.PI / 2, -Math.PI / 2, 0);
  model5.position.set(-450, -40, 0);
  enableShadowForObject(model5);
  scene.add(model5);
});


// Load model 2
loader.load('model/Building_3.glb', function (gltf) {
  model2 = gltf.scene;
  model2.scale.set(80, 80, 80); // có thể điều chỉnh khác với model1
  model2.rotation.set(Math.PI / 2, -Math.PI / 1.5, 0);
  model2.position.set(-380, 200, 0); // đặt xa hơn để không bị chồng lên nhau
  enableShadowForObject(model2);
  scene.add(model2);
});

loader.load('model/Small_Building.glb', function (gltf) {
  model3 = gltf.scene;
  model3.scale.set(100, 100, 100);
  model3.rotation.set(Math.PI / 2, -Math.PI / 1.5, 0);
  model3.position.set(-350, 300, 0);
  enableShadowForObject(model3);
  scene.add(model3);
});
loader.load('model/Large_Building.glb', function (gltf) {
  model6 = gltf.scene;
  model6.scale.set(100, 100, 100);
  model6.rotation.set(Math.PI / 2, 0, 0);
  model6.position.set(0, 440, 0);
  model6.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model6);
});
loader.load('model/Large_Building.glb', function (gltf) {
  model6 = gltf.scene;
  model6.scale.set(100, 100, 100);
  model6.rotation.set(Math.PI / 2, -Math.PI / 2, 0);
  model6.position.set(450, 0, 0);
  model6.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model6);
});


loader.load('model/SmallBuilding_1.glb', function (gltf) {
  model6 = gltf.scene;
  model6.scale.set(100, 100, 100);
  model6.rotation.set(Math.PI / 2, -Math.PI / 1.2, 0);
  model6.position.set(-165, 400, 0);
  model6.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model6);
});

loader.load('model/SmallBuilding_2.glb', function (gltf) {
  model7 = gltf.scene;
  model7.scale.set(100, 100, 100);
  model7.rotation.set(Math.PI / 2, Math.PI / 1.2, 0);
  model7.position.set(170, 400, 0);
  model7.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model7);
});
loader.load('model/Small_Building.glb', function (gltf) {
  model8 = gltf.scene;
  model8.scale.set(100, 100, 100);
  model8.rotation.set(Math.PI / 2, -Math.PI / 1.2, 0);
  model8.position.set(-250, 370, 0);
  model8.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model8);
});
loader.load('model/Skyscraper.glb', function (gltf) {
  model8 = gltf.scene;
  model8.scale.set(80, 80, 80);
  model8.rotation.set(Math.PI / 2, Math.PI / 1.7, 0);
  model8.position.set(400, 200, 0);
  model8.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model8);
});
loader.load('model/Skyscraper.glb', function (gltf) {
  model8 = gltf.scene;
  model8.scale.set(85, 85, 85);
  model8.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  model8.position.set(420, -180, 0);
  model8.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model8);
});
loader.load('model/Computer Large.glb', function (gltf) {
  model8 = gltf.scene;
  model8.scale.set(80, 80, 80);
  model8.rotation.set(Math.PI / 2, -Math.PI / 3, 0);
  model8.position.set(300, 300, 0);
  model8.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;     // Đổ bóng
      node.receiveShadow = true;  // Nhận bóng (nếu cần)
    }
  });
  scene.add(model8);
});

let grassPatchOriginal;
loader.load('model/Grass Patch.glb', function (gltf) {
  grassPatchOriginal = gltf.scene;
  grassPatchOriginal.scale.set(50, 50, 50);
  grassPatchOriginal.rotation.set(Math.PI / 2, 0, 0);
  grassPatchOriginal.position.set(0, -480, 10);
  enableShadowForObject(grassPatchOriginal);

  scene.add(grassPatchOriginal);

  const grass1 = grassPatchOriginal.clone(true);
  grass1.position.set(100, -480, 10);
  scene.add(grass1);

  const grass2 = grassPatchOriginal.clone(true);
  grass2.position.set(-100, -480, 10);
  scene.add(grass2);

  const grass3 = grassPatchOriginal.clone(true);
  grass3.position.set(-180, -420, 10);
  scene.add(grass3);
  const grass4 = grassPatchOriginal.clone(true);
  grass4.position.set(-270, -450, 10);
  scene.add(grass4);
  const grass5 = grassPatchOriginal.clone(true);
  grass5.position.set(270, -450, 10);
  scene.add(grass5);
  const grass6 = grassPatchOriginal.clone(true);
  grass6.position.set(220, -420, 10);
  scene.add(grass6);
  const grass7 = grassPatchOriginal.clone(true);
  grass7.position.set(-320, -350, 10);
  scene.add(grass7);
  const grass8 = grassPatchOriginal.clone(true);
  grass8.position.set(320, -350, 10);
  scene.add(grass8);
  const grass9 = grassPatchOriginal.clone(true);
  grass9.position.set(-390, -290, 10);
  scene.add(grass9);
  const grass10 = grassPatchOriginal.clone(true);
  grass10.position.set(390, -285, 10);
  scene.add(grass10);

});
//----------------------------------Cloud----------------------------------------
function createCloud() {
  const cloud = new THREE.Group();

  const geometry = new THREE.SphereGeometry(7, 16, 32);
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true
  });

  const part1 = new THREE.Mesh(geometry, material);
  const part2 = new THREE.Mesh(geometry, material);
  const part3 = new THREE.Mesh(geometry, material);
  const part4 = new THREE.Mesh(geometry, material);
  part1.position.set(0, 0, 0);
  part2.position.set(5, 0, 0);
  part3.position.set(-5, 0, 0);
  part4.position.set(0, 0, 5);
  cloud.add(part1);
  cloud.add(part2);
  cloud.add(part3);
  cloud.add(part4);

  // Bật shadow (nếu muốn bóng mờ nhẹ)
  cloud.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
    }
  });
  cloud.scale.set(2.5, 2.5, 3);
  return cloud;
}

const clouds = [];

function spawnClouds() {
  for (let i = 0; i < 8; i++) {
    const cloud = createCloud(); // mỗi lần tạo một đám mây mới

    cloud.position.set(
      i * 100 - 320,                // mỗi đám mây cách nhau 100 đơn vị
      Math.random() * 150 + 100,   // cao hơn mặt đất
      320 + Math.random() * 100    // random theo trục Z để có chiều sâu
    );

    cloud.speed = 0.2 + Math.random() * 0.2; // tốc độ bay
    scene.add(cloud);
    clouds.push(cloud);
  }
}
spawnClouds();


//--------------------------------Functions--------------------------------
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(100, -300, 400);
scene.add(sunLight);

sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 100;
sunLight.shadow.camera.far = 2000;
sunLight.shadow.camera.left = -500;
sunLight.shadow.camera.right = 500;
sunLight.shadow.camera.top = 500;
sunLight.shadow.camera.bottom = -500;

// Tạo mặt trời hình cầu để nhìn thấy trên trời
const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(10, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffff00 }) // màu vàng
);
scene.add(sunSphere);
sunSphere.position.set(100, -300, 400);
// Thông số quay
let sunAngle = 0;
const sunRadius = 700; // bán kính quay quanh tâm
const dayNightSpeed = 0.001;
scene.background = new THREE.Color(0x87ceeb);
let waveClock = new THREE.Clock();
function animation(timestamp) {

  if (isPaused) return;

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    requestAnimationFrame(animation);
    return;
  }
  const elapsed = waveClock.getElapsedTime();
  if (sunSphere) {
    sunAngle += dayNightSpeed;

    const sunX = 0;
    const sunY = Math.cos(sunAngle) * sunRadius;
    const sunZ = Math.sin(sunAngle) * sunRadius;

    sunLight.position.set(sunX, sunY, sunZ);
    sunLight.target.position.set(0, 0, 0);
    sunLight.target.updateMatrixWorld();

    sunSphere.position.set(sunX, sunY, sunZ);

    // === ĐIỀU CHỈNH ĐỘ SÁNG NGÀY – ĐÊM ===
    const brightness = Math.max(0, Math.sin(sunAngle));
    sunLight.intensity = brightness * 2;
    ambientLight.intensity = 1.0 + 0.3 * brightness;

    // === CHUYỂN ĐỔI MÀU TRỜI (sáng → tối) ===
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x0d1b2a), // màu đêm
      new THREE.Color(0x87ceeb), // màu sáng
      brightness
    );
    scene.background = skyColor;
  }
  if (clouds) {
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.speed;

      if (cloud.position.x > 450) {
        cloud.position.x = -500;
        cloud.position.y = Math.random() * 150 + 100;
        cloud.position.z = 320 + Math.random() * 100;
      }
    });
  }
  if (player2) {
    player2.position.z = Math.sin(elapsed * 1.5) * 0.5;
    player2.rotation.y = Math.sin(elapsed * 1.2) * 0.15;
    player2.rotation.x = Math.cos(elapsed * 0.8) * 0.03;
  }
  if (duck) {
    duck.position.add(duckVelocity);

    // Kiểm tra va chạm biên rào ảo (ví dụ vùng hình vuông)
    const boundary = innerTrackRadius - 60; // bán kính vùng chuyển động

    if (duck.position.x > boundary || duck.position.x < -boundary) {
      duckVelocity.x *= -1; // Đổi hướng trục x
      duck.position.x = THREE.MathUtils.clamp(duck.position.x, -boundary, boundary);
    }

    if (duck.position.y > boundary || duck.position.y < -boundary) {
      duckVelocity.y *= -1; // Đổi hướng trục y
      duck.position.y = THREE.MathUtils.clamp(duck.position.y, -boundary, boundary);
    }

    // Hướng quay theo vận tốc
    duck.rotation.z = Math.atan2(duckVelocity.y, duckVelocity.x);
    const distance = duck.position.distanceTo(player2.position);
    if (distance < (duckRadius + shipRadius)) {
      duckVelocity.multiplyScalar(-1); // phản lại
    }
  }
  const timeDelta = timestamp - lastTimestamp;
  movePlayerCar(timeDelta);
  renderer.render(scene, camera);
  lastTimestamp = timestamp;
  requestAnimationFrame(animation);
}

function movePlayerCar(timeDelta) {
  const playerSpeed = speed;
  playerAngleMoved -= playerSpeed * timeDelta;

  const totalPlayerAngle = playerAngleInitial + playerAngleMoved;

  const playerX = Math.cos(totalPlayerAngle) * trackRadius;
  const playerY = Math.sin(totalPlayerAngle) * trackRadius;

  playerCar.position.x = playerX;
  playerCar.position.y = playerY;
  playerCar.rotation.z = totalPlayerAngle - Math.PI / 2;

  const playerSpeed1 = 0.001;
  playerAngleMoved1 -= playerSpeed1 * timeDelta;
  const totalPlayerAngle1 = playerAngleInitial + playerAngleMoved1;
  const playerX1 = Math.cos(totalPlayerAngle1) * trackRadius2;
  const playerY1 = Math.sin(totalPlayerAngle1) * trackRadius2;

  player1.position.x = playerX1;
  player1.position.y = playerY1;
  player1.rotation.z = totalPlayerAngle1 - Math.PI / 2;


}
const duck = Duck();
duck.position.set(0, 100, 0);
duck.scale.set(0.3, 0.3, 0.3);
scene.add(duck);

const duckVelocity = new THREE.Vector3(
  (Math.random() - 0.5) * 2,
  (Math.random() - 0.5) * 2,
  0
);
const duckRadius = 15;
const shipRadius = 45;

enableShadowForObject(duck);

const player1 = Truck();
scene.add(player1);

const player2 = ship();
player2.position.set(0, 0, 0);

scene.add(player2);

const playerCar = Car();
scene.add(playerCar);

renderer.render(scene, camera);




function reset() {
  playerAngleMoved = 0;
  playerAngleMoved1 = 0;
  lastTimestamp = undefined;
  movePlayerCar(0);
  renderer.render(scene, camera);
}
reset();


window.addEventListener('keydown', (event) => {
  if (event.key === 'p' || event.key === 'P') {
    isPaused = true;
    waveClock.stop(); // Dừng thời gian
  }
  if (event.key === 'r' || event.key === 'R') {
    isPaused = false;
    waveClock.start(); // Tiếp tục thời gian
    lastTimestamp = null; // Reset timestamp để tránh bước nhảy
    requestAnimationFrame(animation); // Gọi lại animation
  }
});
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  renderer.render(scene, camera);
}
animate();

