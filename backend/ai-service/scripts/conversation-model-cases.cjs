const history = [
  {
    senderName: "Lan",
    content: "Chốt demo vào thứ Sáu lúc 17:00. Minh chuẩn bị giao diện.",
  },
  {
    senderName: "Minh",
    content: "Mình nhận giao diện, hoàn tất trước thứ Năm 16:00.",
  },
  {
    senderName: "Hà",
    content:
      "API thanh toán còn lỗi. Chưa ai nhận sửa, chưa có deadline sửa API.",
  },
  {
    senderName: "Lan",
    content:
      "Cập nhật: demo chuyển sang thứ Hai lúc 09:00, hủy lịch thứ Sáu 17:00.",
  },
  {
    senderName: "Minh",
    content: "Đã rõ lịch demo mới. Mốc giao diện vẫn giữ nguyên.",
  },
];
const { isDeepStrictEqual } = require("node:util");
const dataset = require("../evaluation/conversations.json");

function gradeStructured(answer, reads, fixture) {
  const historyScope = reads === fixture.expectedHistoryReads;
  try {
    const value = JSON.parse(
      answer.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    );
    return {
      historyScope,
      validJson: true,
      exactFacts: isDeepStrictEqual(value, fixture.expected),
    };
  } catch {
    return { historyScope, validJson: false, exactFacts: false };
  }
}
function plain(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}
function gradeSchedule(answer) {
  let data;
  try {
    data = JSON.parse(
      answer
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    return { validJson: false, optimalFinish: false, feasibleSchedule: false };
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    return { validJson: true, optimalFinish: false, feasibleSchedule: false };
  const lengths = { A: 3, B: 5, C: 2, D: 4 };
  const schedule = data.lich;
  let feasible = Array.isArray(schedule) && schedule.length === 4;
  const slots = new Map();
  if (feasible)
    for (const item of schedule) {
      if (
        !item ||
        typeof item !== "object" ||
        !Object.hasOwn(lengths, item.cong_viec) ||
        slots.has(item.cong_viec) ||
        !Number.isFinite(item.bat_dau) ||
        !Number.isFinite(item.ket_thuc) ||
        item.bat_dau < 0 ||
        item.ket_thuc - item.bat_dau !== lengths[item.cong_viec]
      ) {
        feasible = false;
        break;
      }
      slots.set(item.cong_viec, item);
    }
  if (feasible) {
    const a = slots.get("A"),
      b = slots.get("B"),
      c = slots.get("C"),
      d = slots.get("D");
    feasible =
      b.bat_dau >= a.ket_thuc &&
      c.bat_dau >= a.ket_thuc &&
      d.bat_dau >= Math.max(b.ket_thuc, c.ket_thuc) &&
      Math.max(...schedule.map((s) => s.ket_thuc)) === data.gio_som_nhat;
    for (const time of schedule.map((s) => s.bat_dau)) {
      if (
        schedule.filter((s) => s.bat_dau <= time && s.ket_thuc > time).length >
        2
      )
        feasible = false;
    }
  }
  return {
    validJson: true,
    optimalFinish: data.gio_som_nhat === 12,
    feasibleSchedule: feasible,
  };
}
const cases = [
  {
    id: "summary-update",
    question: "tóm tắt hội thoại",
    history,
    grade(answer, reads) {
      const text = plain(answer);
      return {
        readHistory: reads === 1,
        latestDemo: /thu hai/.test(text) && /0?9[:h.]00|9 gio/.test(text),
        ownerAndWork: /minh/.test(text) && /giao dien/.test(text),
        avoidsInventedApiCommitment:
          /chua|chua co|khong co/.test(text) && /api/.test(text),
      };
    },
  },
  {
    id: "missing-owner",
    question:
      "Trong hội thoại, ai đã nhận sửa lỗi API thanh toán và deadline cụ thể là khi nào?",
    history,
    grade(answer, reads) {
      const text = plain(answer);
      return {
        readHistory: reads === 1,
        acknowledgesUnknown: /chua|khong (?:co|duoc|xac dinh|du)/.test(text),
        mentionsApi: /api/.test(text),
      };
    },
  },
  {
    id: "schedule-reasoning",
    question:
      'Có 2 kỹ sư, mỗi người làm tối đa một việc tại một thời điểm. A mất 3 giờ. B mất 5 giờ và chỉ bắt đầu sau A. C mất 2 giờ và chỉ bắt đầu sau A. D mất 4 giờ và chỉ bắt đầu sau cả B lẫn C. Công việc không được chia nhỏ. Bắt đầu tại giờ 0. Hãy tìm thời gian hoàn thành sớm nhất và một lịch hợp lệ. Chỉ trả JSON theo dạng {"gio_som_nhat": số, "lich": [{"cong_viec": "A", "bat_dau": số, "ket_thuc": số}, ...]}.',
    history: [],
    grade(answer, reads) {
      return { noUnnecessaryHistory: reads === 0, ...gradeSchedule(answer) };
    },
  },
];
cases.push(...dataset.cases.map((fixture) => ({
  ...fixture,
  grade: (answer, reads) => gradeStructured(answer, reads, fixture),
})));
module.exports = { cases, gradeSchedule, gradeStructured };
