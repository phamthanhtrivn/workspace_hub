import React from 'react';
import {config,tasks,ids} from './fixtures';
const noop=()=>{};const asyncNoop=async()=>true;
const state={...config,config,isReady:true,syncStatus:'idle',configLoadError:null,sessionRevision:0,completionStatus:'idle',cycleCount:1,mode:'FOCUS',status:'PAUSED',timeLeft:1122,totalDuration:1500,activeTask:{...tasks[0],source:'PROJECT',sourceType:'PROJECT',title:tasks[0].title,projectName:'WorkspaceHub',estimatedPomodoros:4,completedPomodoros:2},ambientTrack:null,ambientVolume:.35,autoPlayAmbient:false,isAmbientPlaying:false,audios:[],isAudioLibraryLoading:false,hasAudioLibraryError:false,hasPlaybackError:false,isAmbientReady:true,isTrackUnavailable:false,ambientSyncStatus:'idle',busy:false,focusRevision:0,taskRevision:0,pendingFocusTarget:null};
state.status=Number(document.body.dataset.screen)===13?'PAUSED':'IDLE';state.notes='Review the document access rules before the sprint meeting.';state.setNotes=noop;state.ambientTrack='moonlight';state.audios=[{id:'moonlight',name:'Moonlight',category:'music',icon:'Moon',description:'A calm piano background for focused work.',s3Key:null,sortOrder:1,url:''},{id:'reverie',name:'Reverie',category:'ambient',icon:'Music',description:'Soft instrumental ambience.',s3Key:null,sortOrder:2,url:''}];
for(const key of ['retrySync','retryCompletion','selectFocusTask','requestSessionAction','start','pause','resume','stopSession','selectAmbientTrack','toggleAmbientPlay','changeAmbientVolume','toggleAutoPlayAmbient','retryAudioLibrary','finishActiveTask','startFocus','startFreeFocus','selectTask','confirmFocusSwitch','cancelFocusSwitch','setFocusDialogOpen'])state[key]=asyncNoop;
export function PomodoroSessionProvider({children}){return children}
export function usePomodoroSession(){return state}
export function useOptionalPomodoroSession(){return state}
export function usePomodoroSessionActions(){return state}
