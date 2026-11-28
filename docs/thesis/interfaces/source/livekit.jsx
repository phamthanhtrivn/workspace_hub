export * from '../../../../frontend/web/node_modules/@livekit/components-react/dist/index.mjs';
import React from 'react';
import {people} from './fixtures';
const noop=()=>{};
const participants=people.map((p,index)=>({identity:p.id,name:p.fullName,isLocal:index===0,isSpeaking:index===1,metadata:JSON.stringify({fullName:p.fullName}),isMicrophoneEnabled:index===0,isCameraEnabled:false,isScreenShareEnabled:false,trackPublications:new Map(),audioTrackPublications:new Map(),videoTrackPublications:new Map(),on:noop,off:noop,getTrackPublication:()=>undefined,setMicrophoneEnabled:async()=>{},setCameraEnabled:async()=>{},setScreenShareEnabled:async()=>{}}));
const tracks=participants.map(participant=>({participant,source:'camera'}));
const room={localParticipant:participants[0],remoteParticipants:new Map(participants.slice(1).map(p=>[p.identity,p])),state:'connected',on:noop,off:noop,disconnect:noop};
export const useConnectionState=()=> 'connected';
export const useRoomContext=()=>room;
export const useParticipants=()=>participants;
export const useSpeakingParticipants=()=>[participants[1]];
export const useTracks=(sources)=>sources?.some(source=>(typeof source==='string'?source:source.source)==='camera')?tracks:[];
export const useTrackToggle=()=>({enabled:true,pending:false,buttonProps:{onClick:noop}});
export const useLocalParticipant=()=>({localParticipant:participants[0],isMicrophoneEnabled:true,isCameraEnabled:false,isScreenShareEnabled:false});
export const isTrackReference=()=>false;
export function LiveKitRoom({children}){return children}
