export interface LiveKitParticipantTokenParams {
  roomName: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  deviceSettings?: {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    cameraDeviceId?: string;
    microphoneDeviceId?: string;
  };
  canShareScreen?: boolean;
}

export interface LiveKitRoomMetadata {
  meetingType?: string;
  createdBy?: string;
  autoAdmit?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}