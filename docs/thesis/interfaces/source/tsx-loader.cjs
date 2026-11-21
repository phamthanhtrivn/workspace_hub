const {createRequire}=require('node:module');
const path=require('node:path');
const web=createRequire(path.resolve(__dirname,'../../../../frontend/web/package.json'));
module.exports=function(source){
  const ts=web('typescript');
  return ts.transpileModule(source,{fileName:this.resourcePath,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,esModuleInterop:true,allowSyntheticDefaultImports:true}}).outputText;
};
