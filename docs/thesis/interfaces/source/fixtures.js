export const uuid=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
export const ids={user:uuid(1),project:uuid(10),task:uuid(100),space:uuid(20),channel:uuid(21),dm:uuid(25),notebook:uuid(30),calendar:uuid(40),document:uuid(52)};

const HCM_OFFSET_MS=7*60*60*1000;
const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const [todayYear,todayMonth,todayDay]=todayKey.split('-').map(Number);
const todayMidnightUtc=Date.UTC(todayYear,todayMonth-1,todayDay);
const dayOfWeekMon0=(new Date(todayMidnightUtc).getUTCDay()+6)%7;

function hcmIso(offsetDays,hourHcm=9,minute=0){
  return new Date(todayMidnightUtc+offsetDays*86400000+(hourHcm*60+minute)*60000-HCM_OFFSET_MS).toISOString();
}
function weekIso(weekdayMon0,hourHcm=9,minute=0){
  return hcmIso(weekdayMon0-dayOfWeekMon0,hourHcm,minute);
}

export const timestamp=hcmIso(0,10,0);

const avatarFiles=['assets/avatars/tri.svg','assets/avatars/linh.svg','assets/avatars/minh.svg','assets/avatars/an.svg'];
export const people=['Thanh Tri','Khanh Linh','Hoang Minh','Minh An'].map((fullName,index)=>({
  id:uuid(index+1),
  userId:uuid(index+1),
  fullName,
  displayName:fullName,
  email:['thanhtri','khanhlinh','hoangminh','minhan'][index]+'@workspacehub.edu.vn',
  avatarUrl:avatarFiles[index],
  phoneNumber:'+84 912 345 678',
  dob:'2003-08-15',
  bio:'Software engineering student working on WorkspaceHub.',
  createdAt:hcmIso(-14,9,0),
  updatedAt:timestamp,
}));

export const members=people.map((person,index)=>({
  ...person,
  id:uuid(200+index),
  projectId:ids.project,
  role:index<2?'ADMIN':'MEMBER',
  canCreateTask:true,
  canEditOwnTask:true,
  canEditOthersTask:index<2,
  canManageMembers:index<2,
  canManageLabels:index<2,
  canEditDocuments:true,
  joinedAt:hcmIso(-14,9,0),
}));

export const labels=[
  {id:uuid(90),projectId:ids.project,name:'Backend',color:'#22396F'},
  {id:uuid(91),projectId:ids.project,name:'Frontend',color:'#24633E'},
  {id:uuid(92),projectId:ids.project,name:'Integration',color:'#795418'},
  {id:uuid(93),projectId:ids.project,name:'AI & RAG',color:'#6D28D9'},
  {id:uuid(94),projectId:ids.project,name:'Realtime',color:'#0369A1'},
];

const baseTasks=[
  ['Implement document access controls','IN_PROGRESS','URGENT',0,0,0],
  ['Connect project tasks to the calendar','IN_PROGRESS','HIGH',2,2,1],
  ['Sync real-time sidebar badges via Socket.IO','IN_PROGRESS','HIGH',0,4,0],
  ['Review calendar recurrence rules','TODO','MEDIUM',1,0,-1],
  ['Prepare project demonstration','TODO','HIGH',3,1,1],
  ['Design onboarding empty states','TODO','LOW',2,1,2],
  ['Review notebook source citations','IN_REVIEW','MEDIUM',3,3,0],
  ['Verify multi-DM document copy retry','IN_REVIEW','HIGH',1,2,1],
  ['Build the project Kanban board','DONE','HIGH',1,1,-2],
  ['Add meeting recording metadata','DONE','MEDIUM',2,0,-1],
  ['Configure JWT refresh token rotation','DONE','HIGH',0,0,-3],
  ['Deprecate legacy v1 export format','CANCELLED','LOW',2,0,-4],
].map(([title,status,priority,owner,label,dueOffset],index)=>({
  id:uuid(100+index),
  projectId:ids.project,
  title,
  description:'Implement resource-level permissions for personal and project documents. Validate project membership and apply viewer or editor permissions before returning file content.',
  priority,
  status,
  createdBy:ids.user,
  reporterId:ids.user,
  startDate:hcmIso(-4,9,0),
  dueDate:hcmIso(dueOffset,17,0),
  allDay:false,
  rank:String(index).padStart(4,'0'),
  createdAt:hcmIso(-5,9,0),
  updatedAt:timestamp,
  completedAt:status==='DONE'?timestamp:null,
  estimatedMinutes:240,
  checklists:['Validate project membership','Apply viewer and editor permissions','Revoke access after membership changes','Check shared-link expiry','Review permission messages'].map((itemTitle,i)=>({
    id:uuid(300+index*10+i),
    taskId:uuid(100+index),
    title:itemTitle,
    completed:status==='DONE'||i<3,
    createdAt:timestamp,
    rank:String(i),
  })),
  assignees:[{
    id:uuid(400+index),
    taskId:uuid(100+index),
    userId:people[owner].id,
    displayName:people[owner].fullName,
    avatarUrl:people[owner].avatarUrl,
    assignedAt:timestamp,
  }],
  comments:[{
    id:uuid(500+index),
    taskId:uuid(100+index),
    authorId:people[1].id,
    authorName:people[1].fullName,
    content:'Please check the access rules after a project member is removed.',
    edited:false,
    createdAt:timestamp,
    updatedAt:timestamp,
  }],
  activities:[
    {id:uuid(2600+index*2),taskId:uuid(100+index),actorId:people[0].id,actorName:people[0].fullName,action:'STATUS_CHANGED',field:'status',oldValue:'TODO',newValue:status,createdAt:hcmIso(-1,14,0)},
    {id:uuid(2601+index*2),taskId:uuid(100+index),actorId:people[1].id,actorName:people[1].fullName,action:'COMMENTED',field:null,oldValue:null,newValue:'Added review feedback',createdAt:timestamp},
  ],
  timeTrackings:[],
  labels:[labels[label],labels[(label+1)%labels.length]].slice(0,index%2===0?2:1),
  documentAttachments:[],
  pomodoroSessions:[],
}));

export const tasks=baseTasks;
tasks.forEach((task,index)=>{
  task.taskNumber=18+index;
  task.key='project:'+task.id;
  task.sourceId=task.id;
  task.source='project';
  task.dueAt=task.dueDate;
  task.dateOnly=false;
  task.href='/projects/'+ids.project+'?taskId='+task.id;
  task.projectName='WorkspaceHub';
});

['Validate viewer download access','Handle expired sharing links','Revoke inherited project access'].forEach((title,index)=>{
  const task=tasks[index+3];
  if(task){
    task.title=title;
    task.parentTaskId=ids.task;
  }
});

export const project={
  id:ids.project,
  name:'WorkspaceHub',
  color:'#22396F',
  icon:'🚀',
  description:'An integrated platform for projects, team collaboration and AI-assisted work.',
  ownerId:ids.user,
  status:'ACTIVE',
  startDate:hcmIso(-14,9,0),
  dueDate:hcmIso(14,17,0),
  archived:false,
  createdAt:hcmIso(-14,9,0),
  updatedAt:timestamp,
  totalTaskCount:tasks.length,
  completedTaskCount:tasks.filter(task=>task.status==='DONE').length,
  members,
  tasks,
  labels,
  projectSetting:{id:uuid(99),projectId:ids.project,allowMemberCreateTask:true,allowMemberEditOwnTask:true,allowMemberEditOthersTask:false,allowMemberInvite:false},
  accessSync:{status:'READY',state:'READY'},
};

export const projects=[
  project,
  {...project,id:uuid(11),name:'Design Research',icon:'🎨',color:'#795418',totalTaskCount:18,completedTaskCount:13,description:'Reference materials, research notes and product design decisions.'},
  {...project,id:uuid(12),name:'Personal Learning',icon:'📘',color:'#24633E',totalTaskCount:16,completedTaskCount:6,description:'Technical reading, learning milestones and focus sessions.'},
  ...['Knowledge Base','Team Portfolio','Internship Portal','Release Planning'].map((name,index)=>({
    ...project,
    id:uuid(13+index),
    name,
    icon:['📚','💻','🎓','📅'][index],
    color:['#795418','#24633E','#6D28D9','#0369A1'][index],
    description:['Collect product knowledge and technical reference materials.','Build a portfolio for the project team.','Organize internship applications and progress.','Plan milestones and coordinate the next release.'][index],
    totalTaskCount:[15,22,18,12][index],
    completedTaskCount:[8,15,9,3][index],
  })),
];

export const page=(data)=>({data,items:data,meta:{page:1,limit:20,total:data.length,totalItems:data.length,totalPages:1},page:1,limit:20,total:data.length,totalPages:1});

export const documents=[
  'Research & references',
  'Architecture & diagrams',
  'System requirements.pdf',
  'API specification.docx',
  'Project timeline.xlsx',
  'Meeting notes.docx',
  'Database design.pdf',
].map((name,index)=>({
  id:uuid(50+index),
  ownerUserId:ids.user,
  ownerEmail:people[0].email,
  parentFolderId:null,
  projectId:null,
  name,
  type:index<2?'FOLDER':'FILE',
  s3Key:index<2?null:'documents/'+name,
  mimeType:index<2?null:name.endsWith('pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes:index<2?0:index===2?2516582:190464,
  containedSizeBytes:index<2?4194304:0,
  isStarred:index===2,
  isArchived:false,
  archivedAt:null,
  createdAt:timestamp,
  updatedAt:timestamp,
  linkAccess:index===2?'VIEWER':'NONE',
  userRole:'OWNER',
  ownerProfile:people[0],
}));

for(const [index,name] of ['Sprint planning.pdf','Architecture decisions.docx','Integration checklist.xlsx','Security review.pdf','Release notes.docx','User interface guidelines.pdf','Meeting summary.docx','Project presentation.pptx'].entries()){
  documents.push({
    ...documents[2],
    id:uuid(60+index),
    name,
    isStarred:index===0,
    sizeBytes:[524288,198656,94208,1572864,67584,3250585,82944,4194304][index],
    mimeType:name.endsWith('.pdf')?'application/pdf':name.endsWith('.xlsx')?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':name.endsWith('.pptx')?'application/vnd.openxmlformats-officedocument.presentationml.presentation':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    updatedAt:hcmIso(-index,10,0),
  });
}

tasks[0].documentAttachments=[documents[2],documents[6]].map((document,index)=>({
  id:uuid(2300+index),
  taskId:ids.task,
  projectId:ids.project,
  documentItemId:document.id,
  source:'PROJECT_DOCUMENT',
  name:document.name,
  mimeType:document.mimeType,
  sizeBytes:document.sizeBytes,
  attachedBy:ids.user,
  createdAt:timestamp,
}));

tasks[0].comments.push(
  {id:uuid(2400),taskId:ids.task,authorId:people[0].id,authorName:people[0].fullName,content:'The membership checks are complete. I am reviewing the sharing-link expiry cases next.',edited:false,createdAt:hcmIso(0,10,15),updatedAt:timestamp},
  {id:uuid(2401),taskId:ids.task,authorId:people[3].id,authorName:people[3].fullName,content:'The document requirements and database design are attached for reference.',edited:false,createdAt:hcmIso(0,10,20),updatedAt:timestamp},
);

export const calendars=[{id:ids.calendar,ownerUserId:ids.user,name:'Personal',color:'#22396F',isDefault:true,projectId:null,isVisible:true,timeZone:'Asia/Ho_Chi_Minh',createdAt:timestamp,updatedAt:timestamp}];

export const events=[
  ['Architecture discussion',hcmIso(0,9,0),hcmIso(0,10,0)],
  ['Sprint review',hcmIso(0,14,0),hcmIso(0,14,45)],
  ['Documentation review',hcmIso(1,15,0),hcmIso(1,15,30)],
  ...['Team planning','Document sharing review','Focus: task permissions','Source citation review','Calendar integration demo','Requirements discussion','Backend coordination','Weekly retrospective','Deployment preparation'].map((title,index)=>[
    title,
    weekIso(index%6,index%2?14:9,0),
    weekIso(index%6,index%2?15:10,0),
  ]),
].map(([title,startAt,endAt],index)=>({
  id:uuid(600+index),
  calendarId:ids.calendar,
  createdBy:ids.user,
  title,
  description:'Review project progress and coordinate the next steps.',
  startAt,
  endAt,
  allDay:false,
  color:['#22396F','#24633E','#795418','#6D28D9'][index%4],
  sourceType:'EVENT',
  status:'CONFIRMED',
  calendar:calendars[0],
  documentIds:[],
  exceptionDates:[],
  reminders:[],
  attendees:[],
  recurrenceRule:null,
  createdAt:timestamp,
  updatedAt:timestamp,
}));

export const meetingItems=[
  'Sprint review',
  'Architecture walkthrough',
  'Documentation review',
  'Backend integration review',
  'Document access walkthrough',
  'Thesis progress update',
].map((title,index)=>({
  id:uuid(700+index),
  meetingId:uuid(700+index),
  roomName:'workspacehub-sprint-review',
  joinToken:index===0?'sprint-review':'meeting-'+(index+1),
  title,
  description:'Review implementation progress, document permissions and calendar integration.',
  type:'SCHEDULED',
  status:'SCHEDULED',
  hostId:ids.user,
  hostName:people[0].fullName,
  host:people[0],
  hostProfile:people[0],
  createdBy:ids.user,
  scheduledStartAt:hcmIso(index<2?0:index-1,index===0?14:16,0),
  scheduledEndAt:hcmIso(index<2?0:index-1,index===0?14:16,45),
  createdAt:timestamp,
  updatedAt:timestamp,
  participantCount:4,
  participants:people.map((person,i)=>({id:uuid(750+i),userId:person.id,role:i===0?'HOST':'PARTICIPANT',status:'ACCEPTED',profile:person})),
  participantRole:'HOST',
  invitationStatus:'ACCEPTED',
  canStart:true,
  canJoin:true,
  requiresPassword:false,
  autoAdmit:true,
  chatEnabled:true,
  screenShareEnabled:true,
  hidden:false,
}));

export const config={focusDuration:25,shortBreak:5,longBreak:15,longBreakInterval:4,autoStartBreak:false,autoStartFocus:false,dailyGoalPomodoros:4};

export const focusSessions=Array.from({length:7},(_,index)=>({
  id:uuid(800+index),
  userId:ids.user,
  taskId:ids.task,
  sessionType:'FOCUS',
  status:'COMPLETED',
  startedAt:hcmIso(-Math.floor(index/2),9+(index%2)*2,0),
  endedAt:hcmIso(-Math.floor(index/2),9+(index%2)*2,25),
  durationSeconds:1500,
  actualSeconds:1500,
  plannedSeconds:1500,
  notes:'Completed access-control validation and test cases.',
  taskTitle:tasks[0].title,
}));

const sources=documents.filter(document=>document.type==='FILE').slice(0,3).map((document,index)=>({
  id:uuid(850+index),
  name:document.name,
  revision:'1',
  document_id:document.id,
  version_id:uuid(860+index),
  size_bytes:document.sizeBytes,
  status:'READY',
  progress:100,
  chunk_count:24,
  error:null,
}));
sources[2]={...sources[2],name:documents[6].name,document_id:documents[6].id};

export const notebook={
  id:ids.notebook,
  title:'WorkspaceHub research',
  description:'Architecture notes, access-control rules and database design references.',
  category:'RESEARCH',
  color:'#22396F',
  sources,
  messages:[
    {id:uuid(870),role:'USER',content:'How does document sharing work for project members?',citations:[],sources:[]},
    {
      id:uuid(871),
      role:'ASSISTANT',
      content:'Project documents are available within the authorized project membership scope. Explicit permissions determine whether a person can view or edit a document.\n\n### Required access checks\n\n1. Verify project membership before granting access.\n2. Apply viewer or editor permissions to the requested operation.\n3. Check the password and expiry for restricted sharing links.\n4. Update inherited access when project membership changes.\n\nThe same access rules protect document metadata and file retrieval.',
      citations:sources.map((source,index)=>({
        id:String(index+1),
        sourceId:source.id,
        label:String(index+1),
        text:'Project membership and sharing permissions define access to document content.',
        name:source.name,
        documentId:source.document_id,
        versionId:source.version_id,
        page:3,
        position:index,
      })),
      sources:sources.map(s=>({id:s.id,revision:s.revision})),
    },
  ],
  notes:[{id:uuid(880),title:'Document access review',content:'Check project membership, viewer/editor permissions and shared-link restrictions before returning file content.',citations:[]}],
  updated_at:timestamp,
};

export const settings={theme:'light',language:'en',timezone:'Asia/Ho_Chi_Minh',allowNewDirectMessages:true,muteNotification:false};

const completedTasks=[];
for(let day=0;day<184;day++){
  const count=(day*17+7)%11<7&&day%7!==6?1+(day*13%4):0;
  for(let index=0;index<count;index++){
    completedTasks.push({key:`completed-${day}-${index}`,completedAt:hcmIso(-day,10+index,0)});
  }
}

const notifications=[
  ['PROJECT_TASK_ASSIGNED','New task assigned','Khanh Linh assigned a document permission review to you.'],
  ['DOCUMENT_SHARED','Document shared','Minh An shared System requirements.pdf with you.'],
  ['MEETING_INVITATION','Sprint review invitation','The development team will meet today at 2:00 PM.'],
  ['PROJECT_TASK_UPDATED','Task status updated','Hoang Minh updated the calendar integration task.'],
  ['CALENDAR_REMINDER','Upcoming event','Your architecture discussion starts in 15 minutes.'],
].map(([type,title,content],index)=>({
  id:uuid(2500+index),
  recipientId:ids.user,
  senderId:people[(index+1)%4].id,
  senderName:people[(index+1)%4].fullName,
  senderAvatar:people[(index+1)%4].avatarUrl,
  type,
  title,
  content,
  isRead:index>2,
  link:'/projects/'+ids.project,
  metadata:{projectId:ids.project,taskId:ids.task},
  createdAt:hcmIso(0,9,30-index*5),
  updatedAt:timestamp,
}));

export const chatMembers=people.map((person,index)=>({
  id:uuid(1800+index),
  userId:person.id,
  profile:person,
  role:index===0?'ADMIN':'MEMBER',
  joinedAt:timestamp,
  lastReadMessageId:null,
  muted:false,
  nickname:null,
}));

const chatSetting={id:uuid(1850),allowSendMessage:true,allowCreatePoll:true,allowCreateNote:true,allowCreateTask:true,allowPinMessage:true};
export const channels=['development','general','design','announcements'].map((name,index)=>({
  id:index===0?ids.channel:uuid(220+index),
  spaceId:ids.space,
  name,
  avatarUrl:null,
  createdBy:ids.user,
  ownerId:ids.user,
  createdAt:timestamp,
  updatedAt:timestamp,
  projectId:ids.project,
  visibility:'PUBLIC',
  isDefault:index===1,
  setting:chatSetting,
  members:chatMembers,
  unreadCount:index===0?3:0,
  messages:[],
}));

export const spaces=[{
  id:ids.space,
  name:'WorkspaceHub',
  ownerId:ids.user,
  createdBy:ids.user,
  projectId:ids.project,
  defaultChannelId:ids.channel,
  memberCount:4,
  channelCount:4,
  setting:{allowMemberCreateChannel:true,allowMemberDeleteOwnChannel:true},
  createdAt:timestamp,
  updatedAt:timestamp,
}];

export const directMessages=people.slice(1).map((person,index)=>({
  ...channels[0],
  id:index===0?ids.dm:uuid(27+index),
  name:null,
  spaceId:undefined,
  projectId:null,
  members:[chatMembers[0],chatMembers[index+1]],
  participants:[chatMembers[0],chatMembers[index+1]],
}));

const messageTexts=[
  'The document access-control changes are ready for review.',
  'I added the permission requirements to the shared project folder.',
  'The Kanban board now shows checklist progress and task priorities.',
  'Please check access after a project member is removed.',
  'I will review the viewer and editor rules before the meeting.',
  'The calendar integration is ready for a walkthrough.',
  'Assigned tasks appear alongside personal calendar events.',
  'I added the architecture decisions and database design references.',
  'Let’s include the shared-link expiry cases in our review.',
  'The source citations are now linked to the selected documents.',
  'I created the sprint review meeting for this afternoon.',
  'Thanks! I will prepare a short update about document permissions.',
];

export const messages=messageTexts.map((content,index)=>({
  id:uuid(1900+index),
  channelId:ids.channel,
  conversationId:ids.dm,
  senderId:people[index%4].id,
  senderProfile:people[index%4],
  type:'TEXT',
  content,
  recalled:false,
  createdAt:hcmIso(0,9,10+index*2),
  updatedAt:timestamp,
  threadReplyCount:index===3?3:0,
  threadParentId:null,
  threadFollowers:[],
  medias:[],
  reactions:index===0?[{userId:people[1].id,emoji:'👍'},{userId:people[2].id,emoji:'👍'}]:[],
  mentions:[],
  pinned:index===0,
}));

const dmMessages=messages.map((message,index)=>({
  ...message,
  channelId:undefined,
  senderId:people[index%2].id,
  senderProfile:people[index%2],
  threadReplyCount:0,
}));

const calendarPersonalTasks=[
  ['Prepare review notes',0,11,60],
  ['Read architecture references',1,10,60],
  ['Update thesis outline',2,15,60],
  ['Review meeting follow-ups',3,10,45],
  ['Organize project documents',4,11,60],
  ['Write weekly progress report',5,15,60],
].map(([title,weekday,hour,duration],index)=>{
  const startAt=weekIso(weekday,hour,0);
  return {
    ...events[0],
    id:uuid(2700+index),
    title,
    description:'Personal task for the WorkspaceHub graduation project.',
    sourceType:'TASK',
    startAt,
    endAt:new Date(Date.parse(startAt)+duration*60000).toISOString(),
    color:'#3B82F6',
    completedAt:null,
    taskOrder:index,
    calendar:calendars[0],
    attendees:[],
  };
});

const calendarProjectTasks=tasks.filter(task=>!task.parentTaskId).slice(0,6).map((task,index)=>{
  const startAt=weekIso(index%6,13,0);
  return {...task,startDate:startAt,dueDate:new Date(Date.parse(startAt)+60*60000).toISOString(),allDay:false};
});

const calendarScreen=Number(document.body.dataset.screen)===12;
const calendarExampleProject={...project,color:'#2E6F43'};
const calendarExampleProjects=projects.map(item=>item.id===ids.project?calendarExampleProject:item);

const quotaSummary={
  userId:ids.user,
  maxBytes:1073741824,
  usedBytes:255642828,
  breakdown:{documentsBytes:142606336,mediaBytes:78643200,otherBytes:34393292},
};

const cache=new Map();
export const unknown=new Set();

export function fixture(key){
  const serialized=JSON.stringify(key);
  if(cache.has(serialized))return cache.get(serialized);
  let result;
  const [first,second,third]=key;

  if(first==='user-setting-profile')result={success:true,data:people[0]};
  else if(first==='user-setting-settings')result={success:true,data:settings};
  else if(first==='user-setting-sessions')result={success:true,data:[{id:uuid(980),deviceName:'Desktop',browser:'Chrome',operatingSystem:'Windows 11',platform:'DESKTOP',location:'Ho Chi Minh City',ipAddress:'192.0.2.10',createdAt:timestamp,lastActiveAt:timestamp,current:true,isCurrent:true}]};
  else if(first==='projects'){
    if(second==='list'||second==='dashboard-active'||second==='sidebar-badge')result=page(projects);
    else if(second==='calendar-list')result=calendarScreen?calendarExampleProjects:projects;
    else if(second==='dashboard-tasks')result=tasks.filter(task=>!['DONE','CANCELLED'].includes(task.status));
    else if(second==='dashboard-completed-tasks')result=completedTasks;
    else if(String(second).startsWith('dashboard-'))result=[];
    else if(third==='members')result=members;
    else if(third==='tasks')result=calendarScreen?calendarProjectTasks:tasks;
    else if(third==='labels')result=labels;
    else if(third==='dependencies'||third==='invitations')result=[];
    else if(third==='task-status-counts')result=Object.fromEntries(['TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED'].map(status=>[status,tasks.filter(task=>task.status===status).length]));
    else if(third==='space-status')result={spaceId:ids.space,status:'READY',state:'READY',available:true};
    else if(third==='access-state')result={status:'READY',state:'READY'};
    else if(third==='linked-task')result=tasks[0];
    else result=project;
  }
  else if(first==='tasks')result=third==='documents'?tasks[0].documentAttachments:third==='activities'?tasks[0].activities:third==='comments'?tasks[0].comments:tasks[0];
  else if(first==='documents'){
    if(second==='list')result=page(documents);
    else if(second==='dashboard-recent')result=page(documents.filter(d=>d.type==='FILE').slice(0,4));
    else if(second==='navigation-summary')result={myFilesCount:12,recentCount:8,starredCount:2,sharedCount:3,trashCount:1};
    else if(second==='folder-tree')result=page(third==='root'?documents.filter(d=>d.type==='FOLDER'):[]);
    else if(second==='breadcrumbs')result=[];
    else if(second==='quota')result=quotaSummary;
    else result=documents[2];
  }
  else if(first==='document-quota')result=quotaSummary;
  else if(first==='notebook-ai'){
    result=third==='list'
      ? page([notebook,...['Software architecture','Thesis preparation','Meeting notes','Security research','Integration references'].map((title,index)=>({...notebook,id:uuid(31+index),title,category:['ARCHITECTURE','ACADEMIC','MEETINGS','SECURITY','INTEGRATION'][index],color:['#24633E','#6D28D9','#795418','#B42332','#0369A1'][index],updated_at:timestamp}))])
      : notebook;
  }
  else if(first==='meeting-upcoming'){
    if(second==='badge-summary'||third==='badge-summary')result={liveCount:0,upcomingTodayCount:2,badgeCount:2};
    else if(second==='dashboard-day')result=meetingItems;
    else result={data:page(meetingItems)};
  }
  else if(first==='meeting-history')result=second==='summary'?{data:{totalMeetings:8,totalDurationMinutes:155,recordings:2}}:{data:page(meetingItems.map(meeting=>({...meeting,status:'ENDED'})))};
  else if(first==='meeting-recordings')result=page(meetingItems.slice(0,5).map((meeting,index)=>({id:uuid(950+index),meetingId:meeting.id,joinToken:meeting.joinToken,meetingTitle:meeting.title,title:meeting.title,ownerId:ids.user,startedBy:ids.user,status:'COMPLETED',requestedAt:timestamp,startedAt:timestamp,stoppedAt:timestamp,completedAt:timestamp,sizeBytes:String([90596966,65432100,47200000,120000000,38500000][index]),durationSeconds:[1938,1686,1240,2452,1116][index],failureCode:null,capabilities:{canView:true,canDownload:true,canManage:true}})));
  else if(first==='meeting-recording-status')result={meetingId:meetingItems[0].id,ownerId:ids.user,recordingAvailable:true,unavailableReason:null,pauseAvailable:true,customLayoutsAvailable:false,settings:{autoRecord:false,layout:'grid'},capabilities:{canStart:true,canStop:true,canGrantRecord:true,canPause:true,canResume:true},recording:{id:uuid(950),status:'RECORDING',startedAt:timestamp,stoppedAt:null,stopRequestedAt:null,version:1,layout:'grid',recordedSeconds:1122,segmentStartedAt:timestamp}};
  else if(first==='meeting-join-requests')result={data:{total:0,items:[]}};
  else if(first==='meeting-messages')result=third==='unread-count'?{data:{count:0}}:{data:{messages:[],nextCursor:null}};
  else if(first==='meeting-access')result={...meetingItems[0],canJoinWithoutApproval:true,participantRole:'HOST',livekit:{serverUrl:'',token:''}};
  else if(first==='notifications')result=second==='unread-count'?{count:3,unreadCount:3}:{message:'',data:notifications,pagination:{page:1,limit:20,total:5,totalPages:1,unreadCount:3,categoryUnreadCount:3,unreadCountsByCategory:{ALL:3,PROJECT:1,CHAT:0,CALENDAR:0,MEETING:1,DOCUMENT:1}}};
  else if(first==='spaces')result=second==='unread-summary'?{totalUnreadCount:4,unreadChannelsCount:3,unreadDirectMessagesCount:1}:spaces;
  else if(first==='space-details')result=spaces[0];
  else if(first==='channels')result={channels};
  else if(first==='direct-messages')result={directMessages};
  else if(first==='messages'){const data=second==='DIRECT_MESSAGE'?dmMessages:messages;result={messages:data,data,items:data,pagination:{hasMore:false,hasOlder:false,hasNewer:false,nextCursor:null,previousCursor:null},hasMore:false,hasOlder:false,hasNewer:false};}
  else if(first==='pinnedMessagesPreview'||first==='pinnedMessagesDetail')result=[messages[0]];
  else if(first==='channel-members'||first==='space-members')result={members:chatMembers,items:chatMembers,ownerId:ids.user,canManage:true,pagination:{page:1,totalPages:1,total:4},data:chatMembers};
  else if(first==='followed-threads'||first==='read-receipts')result=[];
  else if(first==='direct-message-send-permission')result={canSend:true,reason:null};
  else if(first==='document-sharing')result={linkAccess:'VIEWER',shares:people.slice(1).map((person,index)=>({id:uuid(2100+index),documentItemId:ids.document,shareWithUserId:person.id,shareWithEmail:person.email,permission:index===0?'EDITOR':'VIEWER',shareWithProfile:person,createdAt:timestamp,updatedAt:timestamp}))};
  else if(first==='pomodoro'){
    if(second==='config')result=config;
    else if(second==='audios')result=[];
    else if(second==='task-history')result={summary:{focusSeconds:6000,completedFocusSessions:4},sessions:[],pagination:{page:1,totalPages:1,total:0}};
    else if(second==='daily-stats')result={completedPomodoros:3,totalFocusSeconds:4500,date:todayKey};
    else if(second==='report'||second==='dashboard-report')result=focusSessions;
    else if(second==='focus-tasks')result=key[3]==='project'?tasks.map(task=>({task,project})):[];
    else if(second==='ambient-preferences')result={trackId:null,volume:.35,autoPlay:false};
    else result=[];
  }
  else if(first==='calendar'){
    if(second==='calendars')result=calendars;
    else if(second==='today-summary')result={eventsTodayCount:2,tasksDueTodayCount:3,totalTodayCount:5};
    else if(second==='events')result=calendarScreen?[...events,...calendarPersonalTasks]:events;
    else if(second==='tasks')result=calendarPersonalTasks;
    else if(second==='dashboard-tasks')result=calendarPersonalTasks.slice(0,3);
    else if(second==='settings')result={timezone:'Asia/Ho_Chi_Minh',firstDayOfWeek:1,showWeekends:true};
    else result=[];
  }
  else if(serialized.includes('invitation')||serialized.includes('label')||serialized.includes('dependenc'))result=[];
  else if(serialized.includes('quota')||serialized.includes('storage'))result=quotaSummary;
  else if(serialized.includes('profile'))result=people[0];
  else {unknown.add(serialized);result=undefined;}
  cache.set(serialized,result);
  return result;
}
