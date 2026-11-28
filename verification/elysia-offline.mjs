// Pack the rotating model study into one HTML file that also opens via file://.
// Assets and code come from the same modules the campus actually imports.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,relative,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=dirname(here),entry=join(here,'elysia-study.html');
const out=resolve(process.argv[2]??join(here,'elysia-offline.html'));
const deps=new Map();
function intern(file){
  if(!file.startsWith(root+sep)||extname(file)!=='.js')throw Error('Non-local module: '+file);
  const key='campus/'+relative(root,file).split(sep).join('/');
  if(!deps.has(key))deps.set(key,file);return key;
}
function link(code,path){
  return code.replace(/(\bfrom\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_,pre,s,post)=>pre+intern(resolve(dirname(path),s))+post);
}
const html=link(await readFile(entry,'utf8'),entry),imports={};
for(const [key,file] of deps){
  const mod=link(await readFile(file,'utf8'),file);
  imports[key]='data:text/javascript;base64,'+Buffer.from(mod).toString('base64');
}
await writeFile(out,html.replace('<!-- import-map -->','<script type="importmap">'+JSON.stringify({imports})+'</script>'));
console.log('Offline study written:',out);
