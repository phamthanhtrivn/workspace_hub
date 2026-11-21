export * from '../../../../frontend/web/node_modules/@tanstack/react-query/build/modern/index.js';
import {fixture,unknown} from './fixtures';
const noop=()=>{};
const ready={isPending:false,isLoading:false,isFetching:false,isError:false,isSuccess:true,status:'success',fetchStatus:'idle',error:null,isRefetching:false,isPlaceholderData:false,isStale:false,dataUpdatedAt:Date.now(),refetch:async()=>({}),remove:noop};
export function useQuery(options){const raw=options.enabled===false?undefined:fixture(options.queryKey);window.__unknownQueries=unknown;return {...ready,data:raw===undefined?undefined:options.select?options.select(raw):raw};}
const infiniteCache=new WeakMap();
export function useInfiniteQuery(options){const raw=options.enabled===false?undefined:fixture(options.queryKey);if(raw&&typeof raw==='object'&&!infiniteCache.has(raw))infiniteCache.set(raw,{pages:[raw],pageParams:[1]});return {...ready,data:raw===undefined?undefined:infiniteCache.get(raw),hasNextPage:false,hasPreviousPage:false,isFetchingNextPage:false,isFetchingPreviousPage:false,fetchNextPage:async()=>({}),fetchPreviousPage:async()=>({})};}
export function useQueries({queries}){return queries.map(useQuery)}
export function useSuspenseQuery(options){return useQuery(options)}
