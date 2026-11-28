const {createHash}=require('node:crypto');
module.exports=function(source){
  const map={};let css=source;
  if(this.resourcePath.endsWith('.module.css')){
    const prefix='wsh'+createHash('sha1').update(this.resourcePath).digest('hex').slice(0,6);
    for(const m of source.matchAll(/\.([_a-zA-Z][\w-]*)/g))map[m[1]]=prefix+'_'+m[1];
    css=source.replace(/\.([_a-zA-Z][\w-]*)/g,(_,name)=>'.'+map[name]).replace(/:global\(([^)]+)\)/g,'$1');
  }
  return `const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);export default ${JSON.stringify(map)};`;
};
