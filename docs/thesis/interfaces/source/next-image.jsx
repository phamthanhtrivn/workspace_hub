import React from 'react';
function resolveAssetSrc(src){
  const value=typeof src==='string'?src:src?.src||'';
  if(value.startsWith('/brand/'))return 'assets/brand/'+value.slice('/brand/'.length);
  if(value.startsWith('/assets/avatars/'))return 'assets/avatars/'+value.slice('/assets/avatars/'.length);
  return value;
}
export default function Image({src,fill,priority,quality,placeholder,blurDataURL,unoptimized,...props}){
  return <img src={resolveAssetSrc(src)} {...props}/>;
}
