import { MeetingRoomService } from './meeting-room.service';
describe('Readmission after removal', () => {
  it.each([false, true])('requires approval even when autoAdmit=%s', async autoAdmit => {
    const service = Object.create(MeetingRoomService.prototype) as any;
    service.prisma = { meeting: { findUnique: jest.fn().mockResolvedValue({ status: 'LIVE', autoAdmit, channelId: 'channel', hostId: 'host', participants: [{ status: 'REMOVED', role: 'COHOST', requiresReadmission: true }] }) } };
    service.liveKitService = { isConfigured: () => true, createParticipantToken: jest.fn() };
    await expect(service.joinMeeting({ joinToken: 'token', userId: 'removed' })).rejects.toThrow();
    expect(service.liveKitService.createParticipantToken).not.toHaveBeenCalled();
  });
});
