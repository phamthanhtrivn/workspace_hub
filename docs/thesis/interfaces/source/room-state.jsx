import {Mic,MicOff} from 'lucide-react';
import {ids,people} from './fixtures';
const noop=()=>{};const asyncNoop=async()=>{};const alertDialogProps={open:false,onOpenChange:noop,onConfirm:asyncNoop};
export function useMeetingParticipantViewPreferences(){return {mutedParticipantIds:new Set(),pinnedParticipantId:null,isParticipantViewPreferencePending:()=>false,toggleParticipantAudioMute:noop,toggleParticipantPin:noop}}
export function useMeetingHandStates(){return {currentUserHandRaisedAt:null,getParticipantHandRaisedAt:()=>null,applyParticipantHandState:noop}}
export function useMeetingRoomLifecycle(){return {autoAdmit:true,setAutoAdmit:noop,chatEnabled:true,setChatEnabled:noop,currentParticipantRole:'HOST',handleLeave:()=>location.href='14-meetings.html',handleEndForEveryone:noop,alertDialogProps,isLeavePending:false,isEndPending:false}}
export function useMeetingChatNotificationPreference(){return {chatMuted:false,isChatNotificationPreferencePending:false,setChatMuted:noop}}
export function useMeetingScreenShare(){return {screenShareEnabled:true,setScreenShareEnabled:noop,activeScreenShareUserId:null,isLocalSharing:false,isScreenSharePending:false,canStartScreenShare:true,toggleScreenShare:noop,alertDialogProps}}
export function useMeetingRoomInteractions(){return {isHandUpdatePending:false,isReactionPending:false,toggleHand:noop,sendReaction:noop}}
export function useMeetingParticipantTile({trackRef}){const person=people.find(p=>p.id===trackRef.participant.identity)||people[0];const local=person.id===ids.user;return {actionItems:[],actionMenuLabel:'Participant options',AudioStatusIcon:local?Mic:MicOff,audioStatusIconClassName:'text-media-foreground/80',avatarUrl:null,displayName:person.fullName+(local?' (You)':''),hasVideo:false,participantAudioLabel:local?'Microphone on':'Microphone muted',pinnedLabel:'Pin participant',roleLabel:local?'Host':'Participant',shouldShowSpeakingHighlight:person.id===people[1].id}}
