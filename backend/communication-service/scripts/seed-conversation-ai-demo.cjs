// Local demo data only. Run explicitly with --run --owner-email EMAIL.
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
if (!process.argv.includes('--run')) {
  console.log(
    'Usage: node scripts/seed-conversation-ai-demo.cjs --run --owner-email EMAIL',
  );
  process.exit(0);
}
const emailIndex = process.argv.indexOf('--owner-email');
const email = emailIndex >= 0 ? process.argv[emailIndex + 1] : undefined;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw Error('Provide --owner-email for an existing local account');
process.chdir(require('node:path').resolve(__dirname, '..'));
require('../dist/common/config/load-service-env').loadServiceEnvironment();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const userUrl = new URL(
  process.env.USER_DATABASE_URL || process.env.DATABASE_URL,
);
if (!process.env.USER_DATABASE_URL) userUrl.pathname = '/user_db';
const users = new PrismaClient({ datasourceUrl: userUrl.toString() });
let owner;
function id(label) {
  const hex = createHash('sha256')
    .update(`conversation-ai-demo:v1:${owner.id}:${label}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
(async () => {
  await users.$connect();
  const rows = await users.$queryRaw`
    SELECT u.id,u.email,p.full_name AS "fullName",p.avatar_url AS "avatarUrl"
    FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id
    WHERE lower(u.email)=lower(${email})`;
  assert.equal(
    rows.length,
    1,
    'Owner account must exist uniquely in User Service',
  );
  owner = rows[0];
  const people = [
    {
      userId: owner.id,
      email: owner.email,
      fullName: owner.fullName,
      avatarUrl: owner.avatarUrl,
    },
    {
      userId: id('minh'),
      email: 'minh.demo@example.test',
      fullName: 'Minh · Dữ liệu mẫu',
    },
    {
      userId: id('ha'),
      email: 'ha.demo@example.test',
      fullName: 'Hà · Dữ liệu mẫu',
    },
    {
      userId: id('lan'),
      email: 'lan.demo@example.test',
      fullName: 'Lan · Dữ liệu mẫu',
    },
  ];
  const [me, minh, ha, lan] = people.map((person) => person.userId);
  const projectMessages = [
    [
      lan,
      '[TIN CŨ 1/5] Dữ liệu cũ: kế hoạch marketing nháp, ngân sách 99 triệu. Không còn áp dụng.',
    ],
    [minh, '[TIN CŨ 2/5] Dữ liệu cũ: từng đề xuất giao diện màu tím.'],
    [ha, '[TIN CŨ 3/5] Dữ liệu cũ: backend thử nghiệm chưa có thanh toán.'],
    [lan, '[TIN CŨ 4/5] Dữ liệu cũ: từng cân nhắc họp lúc 07:00.'],
    [
      minh,
      '[TIN CŨ 5/5] Kết thúc phần lịch sử cũ. Từ tin tiếp theo là dự án hiện tại.',
    ],
    [
      lan,
      'Bắt đầu dự án mẫu Workspace Hub. Phạm vi sprint: đăng nhập, chat và thanh toán.',
    ],
    [
      lan,
      'Mình phụ trách điều phối và kiểm thử. Minh làm frontend, Hà làm backend.',
    ],
    [lan, 'Lịch demo ban đầu là thứ Sáu lúc 17:00, có thể đổi nếu cần.'],
    [
      minh,
      'Mình nhận giao diện đăng nhập và chat, hạn hoàn tất trước thứ Năm 16:00.',
    ],
    [ha, 'Mình nhận API thanh toán, hạn sửa lỗi trước thứ Năm 15:00.'],
    [lan, 'Mình sẽ bắt đầu kiểm thử sau khi nhận đủ frontend và API.'],
    [minh, 'Trang đăng nhập đã xong bố cục, đang kiểm tra thông báo lỗi.'],
    [lan, 'Ưu tiên đăng nhập ổn định và không gửi trùng tin nhắn.'],
    [
      ha,
      'API thanh toán còn lỗi 500 khi xác nhận giao dịch; mình đang điều tra.',
    ],
    [lan, 'Bộ kiểm thử gồm Chrome, Edge, tin nhắn kênh, tin riêng và luồng.'],
    [minh, 'Danh sách gợi ý mention @ai đã hiển thị trong ô nhập chat.'],
    [lan, 'Việc tích hợp SSO chưa có người nhận và chưa chốt deadline.'],
    [ha, 'Đã xác định lỗi thanh toán do xử lý thiếu trạng thái giao dịch.'],
    [lan, 'Cần thêm kiểm thử gọi lại API để tránh thanh toán hai lần.'],
    [
      minh,
      'Mình đang hoàn thiện hiển thị câu trả lời AI và trạng thái đang gửi.',
    ],
    [
      ha,
      'Thảo luận PAY-01: kiểm thử API thanh toán sau bản sửa. Mở luồng này để xem chi tiết.',
    ],
    [minh, 'Giao diện chat đã hỗ trợ trả lời ngay trong luồng đang mở.'],
    [lan, 'Khi kiểm thử tóm tắt, cần kiểm tra người phụ trách và deadline.'],
    [ha, 'Bản sửa API đã sẵn sàng trên môi trường thử nghiệm.'],
    [
      lan,
      'Mình đã kiểm tra thanh toán thành công và trường hợp từ chối giao dịch.',
    ],
    [minh, 'Frontend vẫn giữ deadline trước thứ Năm lúc 16:00.'],
    [ha, 'Backend vẫn giữ deadline trước thứ Năm lúc 15:00.'],
    [
      lan,
      'Tích hợp SSO được để lại sau sprint, vẫn chưa phân công và chưa có deadline.',
    ],
    [
      minh,
      'Tài liệu hướng dẫn chat sẽ được mình bổ sung sau khi xong giao diện.',
    ],
    [ha, 'Không đưa khóa API hoặc thông tin thanh toán thật vào dữ liệu thử.'],
    [lan, 'Cập nhật quyết định: dời demo sang thứ Hai lúc 09:00.'],
    [lan, 'Lịch demo thứ Sáu 17:00 đã hủy, cả nhóm dùng lịch thứ Hai 09:00.'],
    [minh, 'Mình xác nhận lịch demo mới; hạn giao diện vẫn là thứ Năm 16:00.'],
    [ha, 'Mình xác nhận lịch demo mới; hạn sửa API vẫn là thứ Năm 15:00.'],
    [
      lan,
      'Chốt: mình gửi kết quả kiểm thử trước thứ Sáu 16:00. Demo thứ Hai 09:00. SSO chưa có người nhận hoặc deadline.',
    ],
  ];
  assert.equal(projectMessages.length, 35);
  const baseTime = Date.now() - 45 * 60000;
  const spaceId = id('space'),
    projectId = id('project-channel'),
    guideId = id('guide-channel');
  const conversationId = id('direct-conversation'),
    rootId = id('project-message-20');
  const guidance = [
    'Đây là dữ liệu giả để thử tính năng @ai. Các thành viên Minh, Hà và Lan đều là nhân vật mẫu.',
    'Trong kênh du-an-demo có 35 tin chính: 5 tin cũ đứng trước 30 tin hiện tại. Khi chưa gửi thêm tin, bản tóm tắt không nên nhắc ngân sách 99 triệu của 5 tin cũ.',
    'Thử trong du-an-demo: @ai tóm tắt hội thoại',
    'Hỏi tiếp: @ai Ai phụ trách frontend và deadline là khi nào?',
    'Kiểm tra thông tin thiếu: @ai Ai nhận việc tích hợp SSO và hạn hoàn thành?',
    'Kiểm tra đổi lịch: @ai Lịch demo cuối cùng được chốt là khi nào?',
    'Mở luồng ở tin “Thảo luận PAY-01” rồi gửi @ai tóm tắt hội thoại để thử phạm vi riêng của luồng.',
    'Thử câu hỏi chung trong kênh này: @ai Cho tôi 3 cách ngủ ngon. Câu hỏi chung không cần đọc lịch sử.',
  ];
  const thread = [
    [lan, 'PAY-01: tái hiện bằng cách xác nhận cùng một giao dịch hai lần.'],
    [
      ha,
      'Mình nhận xử lý PAY-01, hạn thứ Năm 15:00. Đã thêm kiểm tra trạng thái.',
    ],
    [
      lan,
      'Luồng này chỉ bàn lỗi thanh toán. Chưa có kết quả kiểm thử hoàn tất, cần chạy lại ca gọi trùng.',
    ],
  ];
  const direct = [
    [minh, 'Chào bạn! Đây là cuộc chat riêng mẫu để thử @ai.'],
    [me, 'Mình muốn thống nhất buổi review giao diện.'],
    [minh, 'Mình đề xuất review lúc 14:00 thứ Tư qua cuộc gọi.'],
    [
      me,
      'Chốt 14:00 thứ Tư. Minh chuẩn bị màn hình đăng nhập và danh sách chat.',
    ],
    [minh, 'Mình sẽ gửi bản xem trước trước 12:00 thứ Tư.'],
    [
      me,
      'Thảo luận riêng: checklist review giao diện. Mở luồng này để thử AI.',
    ],
  ];
  await prisma.$transaction(
    async (tx) => {
      for (const person of people)
        await tx.userProfileSnapshot.upsert({
          where: { userId: person.userId },
          create: person,
          update: {},
        });
      await tx.space.upsert({
        where: { id: spaceId },
        create: {
          id: spaceId,
          name: 'AI Playground · Dữ liệu mẫu',
          createdBy: me,
        },
        update: {},
      });
      await tx.spaceSetting.upsert({
        where: { spaceId },
        create: { spaceId },
        update: {},
      });
      for (const userId of people.map((p) => p.userId))
        await tx.spaceMember.upsert({
          where: { spaceId_userId: { spaceId, userId } },
          create: { spaceId, userId, role: userId === me ? 'ADMIN' : 'MEMBER' },
          update: {},
        });
      for (const [channelId, name, isDefault] of [
        [projectId, 'du-an-demo', true],
        [guideId, 'huong-dan-test', false],
      ]) {
        await tx.channel.upsert({
          where: { id: channelId },
          create: { id: channelId, spaceId, name, createdBy: me, isDefault },
          update: {},
        });
        await tx.channelSetting.upsert({
          where: { channelId },
          create: { channelId },
          update: {},
        });
        for (const userId of people.map((p) => p.userId))
          await tx.channelMember.upsert({
            where: { channelId_userId: { channelId, userId } },
            create: { channelId, userId },
            update: {},
          });
      }
      for (const [index, [senderId, content]] of projectMessages.entries())
        await tx.message.upsert({
          where: { id: id(`project-message-${index}`) },
          update: {},
          create: {
            id: id(`project-message-${index}`),
            channelId: projectId,
            senderId,
            content,
            type: 'TEXT',
            createdAt: new Date(baseTime + index * 60000),
            ...(index === 20
              ? {
                  threadReplyCount: thread.length,
                  threadLastReplyAt: new Date(baseTime + 34 * 60000),
                }
              : {}),
          },
        });
      for (const [index, [senderId, content]] of thread.entries())
        await tx.message.upsert({
          where: { id: id(`thread-${index}`) },
          update: {},
          create: {
            id: id(`thread-${index}`),
            channelId: projectId,
            senderId,
            content,
            type: 'TEXT',
            threadParentId: rootId,
            createdAt: new Date(baseTime + (31 + index) * 60000),
          },
        });
      for (const userId of [me, ha, lan])
        await tx.threadFollower.upsert({
          where: { messageId_userId: { messageId: rootId, userId } },
          create: { messageId: rootId, userId },
          update: {},
        });
      for (const [index, content] of guidance.entries())
        await tx.message.upsert({
          where: { id: id(`guide-${index}`) },
          update: {},
          create: {
            id: id(`guide-${index}`),
            channelId: guideId,
            senderId: lan,
            content,
            type: 'TEXT',
            createdAt: new Date(baseTime + index * 60000),
          },
        });
      await tx.directConversation.upsert({
        where: { id: conversationId },
        update: {},
        create: {
          id: conversationId,
          participants: { create: [{ userId: me }, { userId: minh }] },
        },
      });
      for (const [index, [senderId, content]] of direct.entries())
        await tx.directMessage.upsert({
          where: { id: id(`direct-${index}`) },
          update: {},
          create: {
            id: id(`direct-${index}`),
            conversationId,
            senderId,
            content,
            type: 'TEXT',
            createdAt: new Date(baseTime + index * 60000),
            ...(index === 5
              ? {
                  threadReplyCount: 2,
                  threadLastReplyAt: new Date(baseTime + 8 * 60000),
                }
              : {}),
          },
        });
      for (const [index, [senderId, content]] of [
        [
          minh,
          'Checklist: kiểm tra lỗi đăng nhập, cuộn lịch sử và trả lời trong luồng.',
        ],
        [
          me,
          'Minh kiểm tra giao diện, mình kiểm tra luồng gửi nhận. Chưa chốt deadline cho checklist này.',
        ],
      ].entries())
        await tx.directMessage.upsert({
          where: { id: id(`direct-thread-${index}`) },
          update: {},
          create: {
            id: id(`direct-thread-${index}`),
            conversationId,
            senderId,
            content,
            type: 'TEXT',
            threadParentId: id('direct-5'),
            createdAt: new Date(baseTime + (7 + index) * 60000),
          },
        });
      for (const userId of [me, minh])
        await tx.directThreadFollower.upsert({
          where: { messageId_userId: { messageId: id('direct-5'), userId } },
          create: { messageId: id('direct-5'), userId },
          update: {},
        });
    },
    { timeout: 20000 },
  );
  const counts = {
    projectMessages: await prisma.message.count({
      where: { channelId: projectId, threadParentId: null },
    }),
    projectThreadReplies: await prisma.message.count({
      where: { threadParentId: rootId },
    }),
    guidanceMessages: await prisma.message.count({
      where: { channelId: guideId },
    }),
    directMessages: await prisma.directMessage.count({
      where: { conversationId },
    }),
  };
  console.log(
    JSON.stringify({
      seeded: true,
      ownerEmail: owner.email,
      spaceId,
      projectId,
      guideId,
      conversationId,
      counts,
      chatUrl: `http://localhost:3000/chat?spaceId=${spaceId}&channelId=${projectId}`,
    }),
  );
})()
  .catch((error) => {
    console.error(
      JSON.stringify({
        seeded: false,
        error: error.name,
        code: error.code,
        message: String(error.message)
          .replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL]')
          .slice(-400),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await users.$disconnect();
  });
