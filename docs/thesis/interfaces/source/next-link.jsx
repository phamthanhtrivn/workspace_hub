import React from 'react';
import {localHref} from './navigation';
export default React.forwardRef(function Link({href,prefetch,replace,scroll,legacyBehavior,passHref,children,...props},ref){return <a ref={ref} href={localHref(href)||'#'} {...props}>{children}</a>});
