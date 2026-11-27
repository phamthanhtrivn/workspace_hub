import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {ThemeProvider} from 'next-themes';
import {store} from '@/store/store';
import {setCredentials} from '@/store/auth/auth-slice';
import {setActiveChat} from '@/store/chat/chat-slice';
import WorkspaceShell from '@/components/layout/workspace-shell';
import AuthLayout from '@/app/(auth)/layout';
import Login from '@/app/(auth)/login/page';
import Register from '@/app/(auth)/register/page';
import Dashboard from '@/app/(workspace)/dashboard/page';
import Projects from '@/features/project/screens/projects-screen';
import ProjectDetail from '@/features/project/screens/project-detail-screen';
import Calendar from '@/app/(workspace)/calendar/page';
import Documents from '@/features/documents/components/documents-view';
import {PomodoroView} from '@/features/pomodoro/components/pomodoro-view';
import {PomodoroConfigProvider} from '@/features/pomodoro/components/pomodoro-config-provider';
import {PomodoroSessionProvider} from '@/features/pomodoro/components/pomodoro-session-provider';
import Chat from '@/features/chat/components/chat-layout';
import {MeetingLayout} from '@/features/meeting/components/meeting-layout';
import {MeetingRoomContent} from '@/features/meeting/components/room/meeting-room-content';
import {NotebookList} from '@/features/ai/components/notebook-list';
import {NotebookWorkspace} from '@/features/ai/components/notebook-workspace';
import ShareModal from '@/features/documents/components/sharing/share-modal';
import {screen} from './navigation';
import {ids,people,documents,fixture} from './fixtures';
import {api} from '@/lib/axios';
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false},mutations:{retry:false}}});
api.defaults.adapter=async config=>({data:{success:true,message:'',data:[]},status:200,statusText:'OK',headers:{},config});
window.__fixtureRequests=[];
window.fetch=async(input)=>{window.__fixtureRequests.push(String(input));return new Response(JSON.stringify({success:true,data:[]}),{headers:{'content-type':'application/json'}})};
store.dispatch(setCredentials({accessToken:'illustration-token',userId:ids.user,email:people[0].email,role:'USER',fullName:people[0].fullName,avatarUrl:people[0].avatarUrl}));
if(screen===9)store.dispatch(setActiveChat({chatId:ids.dm,chatType:'DIRECT_MESSAGE'}));
function Room(){return <MeetingRoomContent meetingId="11111111-1111-4111-8111-000000000700" joinToken="sprint-review" participantRole="HOST" initialAutoAdmit initialChatEnabled initialScreenShareEnabled initialActiveScreenShareUserId={null} initialScreenShareStartedAt={null} initialChatMuted={false} initialHandRaisedAt={null} settings={{audioEnabled:true,videoEnabled:false}}/>}
const views={3:Dashboard,4:Projects,5:ProjectDetail,6:ProjectDetail,7:ProjectDetail,8:Chat,9:Chat,10:Documents,11:Documents,12:Calendar,13:PomodoroView,14:MeetingLayout,15:Room,16:MeetingLayout,17:NotebookList,18:()=> <NotebookWorkspace id={ids.notebook}/>,19:Dashboard,20:Dashboard};
class Boundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return {error}}componentDidCatch(error,info){window.__renderError={message:error.message,stack:error.stack,componentStack:info.componentStack};console.error(error)}render(){return this.state.error?<pre style={{padding:30}}>{this.state.error.message}</pre>:this.props.children}}
function App(){
 React.useEffect(()=>{
  if(screen!==12)return;
  // Select through the existing control; leave the application component unchanged.
  let attempts=0;
  const timer=setInterval(()=>{
   const projectCheckbox=document.querySelector('[data-calendar-workspace] [role="checkbox"][aria-label="WorkspaceHub"]');
   if(projectCheckbox){if(projectCheckbox.getAttribute('aria-checked')!=='true')projectCheckbox.click();clearInterval(timer);}
   else if(++attempts>=40)clearInterval(timer);
  },100);
  return()=>clearInterval(timer);
 },[]);
 React.useEffect(()=>{if(screen===19||screen===20){const timer=setTimeout(()=>{const label=screen===19?'AI Assistant':'Open settings';const element=document.querySelector(`button[aria-label="${label}"]`)||[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===label);element?.click()},500);return()=>clearTimeout(timer)}},[]);
 const View=views[screen]||Dashboard;
 if(screen===1||screen===2)return <AuthLayout>{screen===1?<Login/>:<Register/>}</AuthLayout>;
 return <PomodoroConfigProvider><PomodoroSessionProvider><WorkspaceShell><View/>{screen===11?<ShareModal open isOpen item={documents[2]} onClose={()=>location.href='10-documents.html'}/>:null}</WorkspaceShell></PomodoroSessionProvider></PomodoroConfigProvider>;
}
createRoot(document.getElementById('root')).render(<Boundary><ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}><GoogleOAuthProvider clientId="illustration"><QueryClientProvider client={client}><Provider store={store}><App/></Provider></QueryClientProvider></GoogleOAuthProvider></ThemeProvider></Boundary>);
