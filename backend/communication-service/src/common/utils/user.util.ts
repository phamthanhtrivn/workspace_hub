export async function getSenderProfile(
  userId: string,
): Promise<{ senderName: string; senderAvatar: string }> {
  let senderName = 'Người dùng';
  let senderAvatar = '';
  try {
    const userServiceUrl = process.env.USER_SERVICE_URL;
    if (userServiceUrl) {
      const res = await fetch(`${userServiceUrl}/api/users/${userId}/profile`);
      if (res.ok) {
        const profileResponse = await res.json();
        if (profileResponse.success && profileResponse.data) {
          senderName = profileResponse.data.fullName || 'Người dùng';
          senderAvatar = profileResponse.data.avatarUrl || '';
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch user profile for notification:', error);
  }
  return { senderName, senderAvatar };
}
