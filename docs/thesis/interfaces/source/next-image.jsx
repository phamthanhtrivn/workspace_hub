import React from 'react';
export default function Image({src,fill,priority,quality,placeholder,blurDataURL,unoptimized,...props}){return <img src={typeof src==='string'?src:src?.src} {...props}/>}
