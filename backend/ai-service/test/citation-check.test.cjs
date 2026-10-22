const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAnswerCitations,
  inspectAnswerCitations,
} = require("../dist/modules/chat/citation-check");
const evidence = [
  { label: "S1", text: "Budget 500 USD" },
  { label: "S2", text: "December 2026" },
];
test("citation coverage is reported without rejecting a partially cited answer", () => {
  assert.equal(
    validateAnswerCitations(
      "## Summary\n\nBudget 500 USD [[S1]].\n\nImportant:\n- December 2026 [[S2]].",
      evidence,
    ).length,
    2,
  );
  for (const answer of [
    "Budget 500 USD [[S1]].\n\nAnother unsupported claim.",
    "- Budget [[S1]]\n- Unsupported bullet",
  ])
    assert.equal(
      inspectAnswerCitations(answer, evidence).uncitedBlocks.length,
      1,
    );
  for (const answer of ["Unknown [[S3]]", "No references"])
    assert.throws(() => validateAnswerCitations(answer, evidence));
});

test("introductory headings and scope notes accept the screenshot format", () => {
  const content =
    "Tài liệu là slide bài giảng chương 8 với nội dung xoay quanh đo lường và đánh giá chất lượng phần mềm:\n\n- Tính điểm chức năng theo các đại lượng đầu vào và đầu ra [[S1]].\n- Bài tập vận dụng có ví dụ cụ thể [[S2]].\n\nLưu ý: nội dung trên chỉ dựa trên các đoạn trích được cung cấp, chưa thể khẳng định toàn bộ tài liệu chỉ gồm các phần này.";
  const checked = inspectAnswerCitations(content, evidence);
  assert.equal(checked.citations.length, 2);
  assert.deepEqual(checked.uncitedBlocks, []);
  assert.equal(
    inspectAnswerCitations(
      "Budget [[S1]].\n\nLưu ý: ngân sách là 9999 USD.",
      evidence,
    ).uncitedBlocks.length,
    1,
  );
});
