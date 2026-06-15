const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/Construction3D.tsx');
let content = fs.readFileSync(mainPath, 'utf-8');

// 1. Add import
if (!content.includes('import { useBuildStore }')) {
    content = content.replace(
        'import { useBimStore } from "@/store/useBimStore";',
        'import { useBimStore } from "@/store/useBimStore";\nimport { useBuildStore } from "@/store/useBuildStore";'
    );
}

// 2. Replace state definitions
const stateTarget = `  const [editMode, setEditMode] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [objectPositions, setObjectPositions] = useState<Record<string, [number, number, number]>>({});

  type PlacedObject = {
    id: string;
    type: string;
    position: [number, number, number];
    rotationY: number;
    pathType?: string;
  };
  const [customObjects, setCustomObjects] = useState<PlacedObject[]>([]);`;

const stateReplacement = `  const { editMode, setEditMode, pmObjects: customObjects, addPmObject, updatePmObject, removePmObject } = useBuildStore();
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [objectPositions, setObjectPositions] = useState<Record<string, [number, number, number]>>({});
  
  type PlacedObject = {
    id: string;
    type: string;
    position: [number, number, number];
    rotationY: number;
    pathType?: string;
  };`;

content = content.replace(stateTarget, stateReplacement);

// 3. Replace canvas click handler
const canvasClickTarget = `              onClick={(e) => {
                if (editMode) {
                  e.stopPropagation();
                  if (placingItem) {
                    setCustomObjects(prev => [...prev, {
                      id: placingItem.id,
                      type: placingItem.type,
                      position: placementPos,
                      rotationY: placingItem.rotationY
                    }]);
                    setPlacingItem(null);
                  } else {
                    setSelectedObjectId(null);
                  }
                }
              }}`;

const canvasClickReplacement = `              onClick={(e) => {
                if (editMode) {
                  e.stopPropagation();
                  if (placingItem) {
                    addPmObject({
                      id: placingItem.id,
                      type: placingItem.type,
                      position: placementPos,
                      rotationY: placingItem.rotationY,
                      pathType: placingItem.pathType
                    });
                    setPlacingItem(null);
                  } else {
                    setSelectedObjectId(null);
                  }
                }
              }}`;

content = content.replace(canvasClickTarget, canvasClickReplacement);

// 4. Replace custom object render callbacks
const customObjectMapTarget = `                  onPositionChange={(id, pos) => {
                    setCustomObjects(prev => prev.map(o => o.id === id ? { ...o, position: pos } : o));
                  }}
                  onRotate={(id) => {
                    setCustomObjects(prev => prev.map(o => o.id === id ? { ...o, rotationY: o.rotationY + Math.PI / 2 } : o));
                  }}
                  onDelete={(id) => {
                    setCustomObjects(prev => prev.filter(o => o.id !== id));
                    if (selectedObjectId === id) setSelectedObjectId(null);
                  }}`;

const customObjectMapReplacement = `                  onPositionChange={(id, pos) => {
                    updatePmObject(id, { position: pos });
                  }}
                  onRotate={(id) => {
                    const currentObj = customObjects.find(o => o.id === id);
                    if (currentObj) {
                      updatePmObject(id, { rotationY: currentObj.rotationY + Math.PI / 2 });
                    }
                  }}
                  onDelete={(id) => {
                    removePmObject(id);
                    if (selectedObjectId === id) setSelectedObjectId(null);
                  }}`;

content = content.replace(customObjectMapTarget, customObjectMapReplacement);

fs.writeFileSync(mainPath, content);
console.log("Injected useBuildStore into Construction3D.tsx");
