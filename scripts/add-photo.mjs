// Usage: node scripts/add-photo.mjs p1 /absolute/photo.jpg /absolute/credit.json
// credit.json must have author, license, licenseUrl, source. Use images you may redistribute.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [id,input,metadata]=process.argv.slice(2);
const players=JSON.parse(fs.readFileSync(path.join(root,'shared/players.json'),'utf8'));
const player=players.find(p=>p.id===id);if(!player||!input||!metadata)throw Error('Usage: node scripts/add-photo.mjs PLAYER_ID PHOTO.jpg CREDIT.json');
const credit=JSON.parse(fs.readFileSync(metadata,'utf8'));
for(const key of ['author','license','licenseUrl','source'])if(typeof credit[key]!=='string'||!credit[key])throw Error('Missing credit field: '+key);
for(const key of ['licenseUrl','source'])if(new URL(credit[key]).protocol!=='https:')throw Error('Use HTTPS source and licence URLs');
const manifestPath=path.join(root,'app/src/photos.json');const credits=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
fs.copyFileSync(input,path.join(root,`app/assets/players/${id}.jpg`));
credits[id]={...credit,name:player.name,file:`${id}.jpg`,changes:'Cover cropped for display.'};fs.writeFileSync(manifestPath,JSON.stringify(credits,null,2)+'\n');
fs.writeFileSync(path.join(root,'app/src/photos.ts'),'import type {ImageSourcePropType} from "react-native";\nexport const photos:Record<string,ImageSourcePropType>={\n'+Object.entries(credits).filter(([,v])=>v.file).map(([id,v])=>`${JSON.stringify(id)}:require(${JSON.stringify('../assets/players/'+v.file)}),`).join('\n')+'\n};\n');
console.log('Added photo and attribution for '+player.name+'. Rebuild the app.');
