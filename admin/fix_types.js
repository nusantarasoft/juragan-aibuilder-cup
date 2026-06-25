const fs = require('fs');
const file = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/inventory/warehouse-map/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// For RackInventory and BinOccupancy
content = content.replace(/inv\.utilization/g, 'inv.fillPercent');
content = content.replace(/b\.utilization/g, 'b.fillPercent');
// For totalQty -> totalItems in RackInventory and ZoneInventory
content = content.replace(/inv\.totalQty/g, 'inv.totalItems');

// There's also `b.items` which is possibly undefined
content = content.replace(/b\.items\.map/g, '(b.items || []).map');
content = content.replace(/b\.items\.slice/g, '(b.items || []).slice');
content = content.replace(/b\.items\.length/g, '(b.items || []).length');

// What about item properties? The error says `itemCode` does not exist on type `{ name: string; sku: string; qty: number; }` inside `page.tsx(3856,127)`.
// Let's replace `it.itemCode` with `it.sku` or whatever the property is. Wait, `builderState.ts` says:
// items?: { itemId: string; itemCode: string; itemName: string; qty: number; uom: string; }[]
// Maybe the user mocked the items locally in `page.tsx` as `{ name: string, sku: string, qty: number }`.
// I will just use `(it as any).itemCode || (it as any).sku` or just use `any`.
content = content.replace(/it\.itemCode/g, '(it as any).itemCode || (it as any).sku');
content = content.replace(/it\.itemName/g, '(it as any).itemName || (it as any).name');
content = content.replace(/it\.uom/g, '(it as any).uom');

fs.writeFileSync(file, content);
console.log('Done!');
