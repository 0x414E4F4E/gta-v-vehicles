import fs from "bun:fs";
import { XMLParser } from "fast-xml-parser";
import { fileURLToPath } from "bun:url";
import path from "bun:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
});

// config
const list = fs.readFileSync(path.join(__dirname, "list/out.txt"), "utf8").split("\n");
const inputDir = path.join(__dirname, "raw");
const outputDir = path.join(__dirname, "merged");
fs.mkdirSync(outputDir, { recursive: true });
function writeFile(file, content) {
  fs.writeFileSync(path.join(outputDir, file), JSON.stringify(content, undefined, 2));
}

// parsing
function parseDict(dict) {
  if (!(dict instanceof Object)) {
    return dict;
  }
  if (Array.isArray(dict)) {
    // remove duplicate tags
    const filtered = dict.filter((v, i) => dict.indexOf(v) == i).filter(v => v.length > 0);
    if (dict.length > filtered.length && filtered.length == 1) {
      return filtered[0];
    }
    return dict.map(parseDict);
  }
  const keys = Object.keys(dict);
  if (keys.length == 1 && keys[0] == "Item") {
    return parseDict(dict.Item);
  }
  if (keys.length == 1 && keys[0] == "value") {
    return parseDict(dict.value);
  }
  return Object.fromEntries(Object.entries(dict).map(([ k, v ]) => {
    if (!Array.isArray(v) && v instanceof Object) {
      if (v.content == "int_array" || v.content == "char_array") {
        return [ k, typeof v["#text"] == "string" ? v["#text"].split("\n").map(v => parseInt(v.trim())) : v["#text"] ?? v ];
      }
      if (v.content == "float_array") {
        return [ k, typeof v["#text"] == "string" ? v["#text"].split("\n").map(v => parseFloat(v.trim())) : v["#text"] ?? v ];
      }
      return [ k, parseDict(v) ];
    }
    if (k.startsWith("str") && k.endsWith("Flags")) {
      return [ k, `0x${v}` ];
    }
    return [ k, parseDict(v) ];
  }));
}

function parseVehicle(vehicle) {
  return Object.fromEntries(Object.entries(vehicle).map(([ k, v ]) => {
    if (k == "swankness") {
      return [ k, parseInt(v.slice("SWANKNESS_".length)) ];
    }
    if (k == "flags") {
      return [ k, v.length > 0 ? v.split(" ").map(v => v.slice("FLAG_".length)) : [] ];
    }
    if (k == "type") {
      return [ k, v.slice("VEHICLE_TYPE_".length) ];
    }
    if (k == "plateType") {
      return [ k, v.slice("VPT_".length) ];
    }
    if (k == "dashboardType") {
      return [ k, v.slice("VDT_".length) ];
    }
    if (k == "vehicleClass") {
      return [ k, v.slice("VC_".length).replace("COMPACTS", "COMPACT") ];
    }
    if (k == "wheelType") {
      return [ k, v.slice("VWT_".length) ];
    }
    if ([
      "trailers",
      "additionalTrailers",
      "drivers",
      "doorsWithCollisionWhenClosed",
      "driveableDoors",
      "rewards",
      "firstPersonDrivebyData",
    ].includes(k)) {
      return [ k, Array.isArray(v) ? v : v ? [ v ] : [] ];
    }
    if (k == "extraIncludes" || k == "requiredExtras") {
      return [ k, v.length > 0 ? v.split(" ").map(v => v.startsWith("EXTRA_") ? v.slice(6) : v) : [] ];
    }
    return [ k, v ];
  }));
}

function parseHandling(handling) {
  return Object.fromEntries(Object.entries(handling).map(([ k, v ]) => {
    if (k == "SubHandlingData") {
      return [ k, (Array.isArray(v) ? v : [ v ]).filter(v => v.type != "NULL") ];
    }
    return [ k, v ];
  }));
}

function parseCarvar(carvar) {
  return Object.fromEntries(Object.entries(carvar).map(([ k, v ]) => {
    if (k == "kits") {
      return [ k, Array.isArray(v) ? v : v ? [ v ] : [] ];
    }
    if (k == "colors") {
      return [ k, (Array.isArray(v) ? v : [ v ]).map(v => ({
        primary: v.indices[0] ?? 0,
        secondary: v.indices[1] ?? 0,
        pearl: v.indices[2] ?? 0,
        wheels: v.indices[3] ?? 0,
        interior: v.indices[4] ?? 0,
        dashboard: v.indices[5] ?? 0,
        livery: v.liveries?.find(v => v.value == true) ?? 0,
      })) ];
    }
    return [ k, v ];
  }));
}

function parseModkit(modkit) {
  return Object.fromEntries(Object.entries(modkit).map(([ k, v ]) => {
    if ([
      "linkMods",
      "statMods",
      "slotNames",
      "liveryNames",
      "livery2Names",
    ].includes(k)) {
      return [ k, Array.isArray(v) ? v : v ? [ v ] : [] ];
    }
    if (k == "visibleMods") {
      const value = Array.isArray(v) ? v : v ? [ v ] : [];
      value.forEach(v => {
        v.weight = Array.isArray(v.weight) ? v.weight.at(-1) : v.weight;
        v.collisionBone = Array.isArray(v.collisionBone) ? v.collisionBone.at(-1) : v.collisionBone;
        v.linkedModels = Array.isArray(v.linkedModels) ? v.linkedModels : v.linkedModels ? [ v.linkedModels ] : [];
        v.turnOffBones = Array.isArray(v.turnOffBones) ? v.turnOffBones : v.turnOffBones ? [ v.turnOffBones ] : [];
      });
      return [ k, value ];
    }
    return [ k, v ];
  }));
}

// main
let vehicles = {};
let handlings = {};
let carvar = {};
let modkits = {};
list.forEach(d => {
  const dir = path.join(inputDir, d);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.filter(d => d.isFile() && d.name.includes("vehicles"))
      .forEach(d => {
        const content = fs.readFileSync(path.join(d.parentPath, d.name), "utf8");
        const parsed = parser.parse(content);
        const rawList = parsed.CVehicleModelInfo__InitDataList.InitDatas.Item;
        const vehicleList = (Array.isArray(rawList) ? rawList : [ rawList ]).map(v => parseDict(v));
        vehicles = {
          ...vehicles,
          ...Object.fromEntries(vehicleList.map(v => [ v.modelName.toLowerCase(), parseVehicle(v) ])),
        };
      });
    files.filter(d => d.isFile() && d.name.includes("handling"))
      .forEach(d => {
        const content = fs.readFileSync(path.join(d.parentPath, d.name), "utf8");
        const parsed = parser.parse(content);
        const rawList = parsed.CHandlingDataMgr.HandlingData.Item;
        const handlingList = (Array.isArray(rawList) ? rawList : [ rawList ]).map(v => parseDict(v));
        handlings = {
          ...handlings,
          ...Object.fromEntries(handlingList.map(v => [ v.handlingName.toLowerCase(), parseHandling(v) ])),
        };
      });
    files.filter(d => d.isFile() && d.name.includes("carvariations") && d.name.endsWith("meta"))
      .forEach(d => {
        const content = fs.readFileSync(path.join(d.parentPath, d.name), "utf8");
        const parsed = parser.parse(content);
        const rawList = parsed.CVehicleModelInfoVariation.variationData.Item;
        const carvarList = (Array.isArray(rawList) ? rawList : [ rawList ]).map(v => parseDict(v));
        carvar = {
          ...carvar,
          ...Object.fromEntries(carvarList.map(v => [ v.modelName.toLowerCase(), parseCarvar(v) ])),
        };
      });
    Object.values(carvar).forEach(v => {
      vehicles[v.modelName.toLowerCase()].modkits = v.kits ?? [];
      vehicles[v.modelName.toLowerCase()].defaultColors = v.colors;
    });
    files.filter(d => d.isFile() && d.name.includes("carcols") && d.name.endsWith("meta"))
      .forEach(d => {
        const content = fs.readFileSync(path.join(d.parentPath, d.name), "utf8");
        const parsed = parser.parse(content);
        const rawList = parsed.CVehicleModelInfoVarGlobal.Kits.Item;
        const modkitList = (Array.isArray(rawList) ? rawList : [ rawList ]).map(v => parseDict(v));
        modkits = {
          ...modkits,
          ...Object.fromEntries(modkitList.map(v => [ v.id, parseModkit(v) ])),
        };
      });
  }
});
writeFile("vehicles.json", Object.values(vehicles));
writeFile("handlings.json", Object.values(handlings));
writeFile("modkits.json", Object.values(modkits));
