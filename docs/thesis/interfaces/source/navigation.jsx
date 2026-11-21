import React,{useSyncExternalStore} from 'react';
import {ids} from './fixtures';
export const screen=Number(document.body.dataset.screen||3);
const routes={1:'/login',2:'/register',3:'/dashboard',4:'/projects',5:`/projects/${ids.project}`,6:`/projects/${ids.project}?taskId=${ids.task}`,7:`/projects/${ids.project}?view=members`,8:`/chat?spaceId=${ids.space}&channelId=${ids.channel}`,9:`/chat?dmId=${ids.dm}`,10:'/documents',11:'/documents',12:'/calendar',13:'/pomodoro',14:'/meetings?view=upcoming',15:'/meetings/sprint-review',16:'/meetings?view=recordings',17:'/ai',18:`/ai/notebooks/${ids.notebook}`,19:'/dashboard',20:'/dashboard'};
let route=routes[screen]||'/dashboard';
const listeners=new Set();
const files={1:'01-login.html',2:'02-register.html',3:'03-dashboard.html',4:'04-projects.html',5:'05-project-board.html',6:'06-task-details.html',7:'07-project-members.html',8:'08-channel-messages.html',9:'09-direct-messages.html',10:'10-documents.html',11:'11-document-sharing.html',12:'12-calendar.html',13:'13-pomodoro.html',14:'14-meetings.html',15:'15-meeting-room.html',16:'16-meeting-recordings.html',17:'17-notebooks.html',18:'18-notebook-chat.html',19:'19-work-assistant.html',20:'20-account-settings.html'};
export function localHref(href){const value=typeof href==='string'?href:href?.pathname||'#';if(value.startsWith('#'))return value;const normalized=value.split('?')[0];const selected=Object.entries(routes).find(([,candidate])=>candidate===value)||Object.entries(routes).find(([,candidate])=>candidate.split('?')[0]===normalized);return selected?files[selected[0]]:value==='/'?'index.html':undefined;}
function update(value){route=value;listeners.forEach(listener=>listener());}
const router={push(value){const href=localHref(value);if(href)location.href=href;else update(value)},replace(value){update(value)},refresh(){},back(){history.back()},prefetch(){return Promise.resolve()}};
function useRoute(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>route,()=>route)}
export function useRouter(){return router}
export function usePathname(){return useRoute().split('?')[0]}
export function useSearchParams(){const value=useRoute();return React.useMemo(()=>new URLSearchParams(value.split('?')[1]||''),[value])}
export function useParams(){return {id:screen===18?ids.notebook:ids.project,joinToken:'sprint-review'}}
export function useSelectedLayoutSegments(){return []}
export function useSelectedLayoutSegment(){return null}
export function redirect(value){router.push(value)}
export function notFound(){throw new Error('Not found')}
