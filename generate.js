import fs from "bun:fs";
import { fileURLToPath } from "bun:url";
import path from "bun:path";
import vehicles from "./merged/vehicles.json";
import handlings from "./merged/handlings.json";
import modkits from "./merged/modkits.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// config
const outputDir = path.join(__dirname, "output");
fs.mkdirSync(outputDir, { recursive: true });

// meta
const classesMap = {
  "COMPACT": "VEH_CLASS_0",
  "SEDAN": "VEH_CLASS_1",
  "SUV": "VEH_CLASS_2",
  "COUPE": "VEH_CLASS_3",
  "MUSCLE": "VEH_CLASS_4",
  "SPORT_CLASSIC": "VEH_CLASS_5",
  "SPORT": "VEH_CLASS_6",
  "SUPER": "VEH_CLASS_7",
  "MOTORCYCLE": "VEH_CLASS_8",
  "OFF_ROAD": "VEH_CLASS_9",
  "INDUSTRIAL": "VEH_CLASS_10",
  "UTILITY": "VEH_CLASS_11",
  "VAN": "VEH_CLASS_12",
  "CYCLE": "VEH_CLASS_13",
  "BOAT": "VEH_CLASS_14",
  "HELICOPTER": "VEH_CLASS_15",
  "PLANE": "VEH_CLASS_16",
  "SERVICE": "VEH_CLASS_17",
  "EMERGENCY": "VEH_CLASS_18",
  "MILITARY": "VEH_CLASS_19",
  "COMMERCIAL": "VEH_CLASS_20",
  "RAIL": "VEH_CLASS_21",
  "OPEN_WHEEL": "VEH_CLASS_22",
};
const modTypes = [
  "VMT_SPOILER",
  "VMT_BUMPER_F",
  "VMT_BUMPER_R",
  "VMT_SKIRT",
  "VMT_EXHAUST",
  "VMT_CHASSIS",
  "VMT_GRILL",
  "VMT_BONNET",
  "VMT_WING_L",
  "VMT_WING_R",
  "VMT_ROOF",
  "VMT_ENGINE",
  "VMT_BRAKES",
  "VMT_GEARBOX",
  "VMT_HORN",
  "VMT_SUSPENSION",
  "VMT_ARMOUR",
  "VMT_NITROUS",
  "VMT_TURBO",
  "VMT_SUBWOOFER",
  "VMT_TYRE_SMOKE",
  "VMT_HYDRAULICS",
  "VMT_XENON_LIGHTS",
  "VMT_WHEELS",
  "VMT_WHEELS_REAR_OR_HYDRAULICS",
  "VMT_PLTHOLDER",
  "VMT_PLTVANITY",
  "VMT_INTERIOR1",
  "VMT_INTERIOR2",
  "VMT_INTERIOR3",
  "VMT_INTERIOR4",
  "VMT_INTERIOR5",
  "VMT_SEATS",
  "VMT_STEERING",
  "VMT_KNOB",
  "VMT_PLAQUE",
  "VMT_ICE",
  "VMT_TRUNK",
  "VMT_HYDRO",
  "VMT_ENGINEBAY1",
  "VMT_ENGINEBAY2",
  "VMT_ENGINEBAY3",
  "VMT_CHASSIS2",
  "VMT_CHASSIS3",
  "VMT_CHASSIS4",
  "VMT_CHASSIS5",
  "VMT_DOOR_L",
  "VMT_DOOR_R",
  "VMT_LIVERY_MOD",
];

// lang
const lang = [ "en", "zh", "zh-CN", "fr", "de", "it", "ja", "ko", "es-MX", "pl", "pt", "ru", "es" ];
const dict = Object.fromEntries(lang.map(l => [ l, JSON.parse(fs.readFileSync(`../gta-v-labels/labels/${l}.json`, "utf8")) ]));

// hash
function hash(name) {
  return {
    hash: signedHash(name),
    hashUnsigned: unsignedHash(name),
    hexHash: hexHash(name),
  };
}
function signedHash(name) {
  name = name.toLowerCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
    hash += (hash << 10);
    hash ^= (hash >>> 6);
  }
  hash += (hash << 3);
  hash ^= (hash >>> 11);
  hash += (hash << 15);
  return hash;
}
function unsignedHash(name) {
  return signedHash(name) >>> 0;
}
function hexHash(name) {
  return `0x${unsignedHash(name).toString(16).toUpperCase().padStart(8, "0")}`;
}

// label
const labels = {};
function label(label) {
  if (!labels[label.toUpperCase()]) {
    labels[label.toUpperCase()] = Object.fromEntries(lang.map(l => [ l, dict[l][label.toUpperCase()]?.replaceAll("µ", " ") ]));
  }
  return {
    label,
    ...hash(label),
    ...labels[label.toUpperCase()],
  };
}

function writeOutput(file, content) {
  fs.writeFileSync(path.join(outputDir, file), JSON.stringify(content, undefined, 2));
}

// classes
const classes = Object.fromEntries(Object.entries(classesMap).map(([ k, v ]) => [ k, label(v) ]));
writeOutput("classes.json", classes);

// manufacturers
const vehicleMakeNames = vehicles.map(v => v.vehicleMakeName.toUpperCase());
const manufacturers = Object.fromEntries(vehicleMakeNames.filter((v, i) => v && vehicleMakeNames.indexOf(v) == i).sort().map(v => [ v, label(v) ]));
writeOutput("manufacturers.json", manufacturers);

// vehicles
const modkitNames = modkits.map(m => m.kitName.toLowerCase());
const vehiclesOut = vehicles.map(v => ({
  // basic
  model: v.modelName,
  ...hash(v.modelName),
  textureID: v.txdName,
  handlingID: v.handlingId,
  name: label(v.gameName),
  manufacturer: label(v.vehicleMakeName),
  // meta
  type: v.type,
  class: v.vehicleClass,
  plateType: v.plateType,
  dashboardType: v.dashboardType,
  wheelType: v.wheelType,
  swankness: v.swankness,
  flags: v.flags,
  // handling
  handling: handlings.find(h => h.handlingName.toLowerCase() == v.handlingId.toLowerCase()),
  // mods
  modkits: v.modkits,
  statMods: ((mods) => {
    const statMods = {};
    mods.forEach(m => {
      const type = m.type.slice("VMT_".length).toLowerCase();
      statMods[type] = statMods[type] ?? [];
      statMods[type].push(m.modifier);
      delete statMods.horn;
    });
    return statMods;
  })(modkits.find(k => k.kitName.toLowerCase() == v.modkits?.find(m => modkitNames.includes(m.toLowerCase()))?.toLowerCase())?.statMods ?? []),
}));
writeOutput("vehicles.json", vehiclesOut);

// vehicle mods
const vehicleMods = [];
vehiclesOut.forEach(v => {
  const modkit = modkits.find(k => k.kitName.toLowerCase() == v.modkits?.find(m => modkitNames.includes(m.toLowerCase()))?.toLowerCase());
  const mods = modkit?.visibleMods ?? [];
  mods.forEach((m, i) => {
    vehicleMods.push({
      model: m.modelName,
      name: label(m.modShopLabel),
      // vehicle
      vehicle: v.model,
      modkit: modkit.kitName,
      modkitID: modkit.id,
      modkitType: modkit.kitType,
      // index
      type: m.type,
      typeIndex: modTypes.indexOf(m.type),
      modIndex: mods.filter((mm, ii) => mm.type.toUpperCase() == m.type.toUpperCase() && ii <= i).length,
      // model
      weight: m.weight,
      bone: m.bone,
      collisionBone: m.collisionBone,
      linkedModels: m.linkedModels,
      turnOffBones: m.turnOffBones,
      ...Object.fromEntries(Object.entries(m).filter(([ k ]) => ![
        "modelName", "modShopLabel", "type", "weight", "bone", "collisionBone", "linkedModels", "turnOffBones",
      ].includes(k))),
    });
  });
});
writeOutput("mods.json", vehicleMods);
