import React from 'react';
export default function dynamic(loader,options={}){const Lazy=React.lazy(()=>loader().then(value=>({default:value.default||value})));return function Component(props){const Loading=options.loading;return <React.Suspense fallback={Loading?<Loading/>:null}><Lazy {...props}/></React.Suspense>}}
