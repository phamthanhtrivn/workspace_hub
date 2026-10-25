# Đánh giá nâng model cho chat @ai — 24/10/2026

## Model được chọn

**Đã chọn GPT-6.1 Sol cho @ai theo yêu cầu dùng model thông minh và gọn token.** Giữ Astra cho một đợt
đánh giá các bài khó hơn trước khi trả mức giá cao hơn. Đây là đề xuất dựa trên
ba ca QA và tài liệu phân loại model, không phải kết luận Sol luôn thông minh
hơn DeepSeek hoặc Astra trong mọi tình huống.

Model đang phục vụ @ai là `gpt-6.1-sol`, trần 2048 token. Notebook vẫn dùng
`deepseek-v4.1-flash` với trần 4096 token. Cấu hình riêng đã được nạp vào cả
Docker API và worker; key và các giá trị quota giữ nguyên.

## Kết quả cùng agent LangChain, sau sửa

| Model ID tại Vibi | Ca đạt | Độ trễ TB/ca | Request provider | Input token | Completion token |
|---|---:|---:|---:|---:|---:|
| deepseek-v4.1-flash | 3/3 | 3,41 giây | 4 | 1.779 | 885 |
| gpt-6.1-sol | 3/3 | 5,04 giây | 4 | 1.152 | 370 |
| gpt-6-astra | 3/3 | 5,62 giây | 4 | 1.152 | 375 |

Token trong bảng là usage provider trả về, không phải hóa đơn; completion có
thể bao gồm reasoning. Độ trễ đo một lần/ca, tính cả bước tool và quota gate,
không tính khoảng nghỉ 35 giây giữa các ca. Mẫu nhỏ, chưa đủ kết luận về p95,
độ ổn định tải cao hoặc khả năng suy luận ở bài khó.

Ba ca dùng đúng cùng prompt, temperature 0.1, tối đa 4096 output token:

1. Tóm tắt 5 tin QA: demo đổi từ thứ Sáu 17:00 sang thứ Hai 09:00, Minh giữ mốc
   giao diện thứ Năm 16:00, API chưa có người nhận/deadline.
2. Hỏi ai nhận sửa API và deadline: phải đọc tool và nhận biết chưa có dữ kiện;
   không nhầm giờ demo với deadline sửa lỗi.
3. Lập lịch với hai kỹ sư, ràng buộc phụ thuộc: đáp án JSON có thời gian tối ưu
   12 giờ; bộ chấm kiểm tra duration, dependency, tính đủ/duy nhất của công việc
   và không chạy quá hai việc đồng thời.

Đọc thủ công câu trả lời cho thấy cả ba đều giữ đúng các dữ kiện chính. Sol và
Astra viết gọn hơn trong mẫu này. Sol/Astra nói rõ chỉ có 5 tin được cung cấp;
DeepSeek có một câu dùng “30 tin nhắn gần nhất” trong ca hỏi API dù fixture chỉ
có 5 tin. Ca tự động không chấm khác biệt nhỏ về cách diễn đạt này.
Không có điểm số do chính model tự chấm và không dùng nội dung người dùng thật.

## Lỗi tích hợp tìm được khi thử model mạnh hơn

Trước sửa: DeepSeek đạt 3/3; Sol và Astra chỉ đạt 2/3. Cả hai model GPT từ chối
tóm tắt vì agent đã prefetch lịch sử nhưng nhét kết quả vào một `HumanMessage`.
System prompt yêu cầu tool có dữ liệu xác minh; với `tool_choice: none`, model
không thấy một lần tool đã thực thi để làm cơ sở trả lời.

Đã sửa thành `AIMessage` chứa tool call đi kèm `ToolMessage` có cùng call ID.
Lịch sử vẫn là dữ liệu không đáng tin về chỉ dẫn; quyền, cutoff 30 tin và cơ chế
chống lặp giữ nguyên. Sau sửa, ca tóm tắt qua với cả hai GPT chỉ bằng một request.
Regression test thất bại trước sửa, qua sau sửa; toàn bộ AI Service **89/89 test qua**.
Docker image build qua và hai container API/worker đã nhận bản sửa.

Dữ liệu trước sửa nằm trong `evaluation-results/*.before.json`; sau sửa nằm
trong các file model `.json` tương ứng. Mỗi vòng có 9 ca/12 request. Có một
request setup trước khi sửa quyền ghi báo cáo; request đó không nằm trong bảng.
Runner giờ kiểm tra quyền ghi trước khi nạp config/gọi model.

## Chi phí tham khảo của provider

Snapshot công khai: [Vibi pricing](https://vibi.top/api/pricing), lưu tại
[evaluation-results/provider-pricing.json](evaluation-results/provider-pricing.json).
Diễn giải các hệ số `billing_expr` theo định dạng NewAPI là USD/1 triệu token;
đây là ước tính trước hệ số nhóm key, caching và giá theo giờ, không phải báo giá
hóa đơn đã được xác minh với tài khoản.

| Model | Input chưa cache | Output tính phí | Ví dụ 1.000 lượt, mỗi lượt 3.000 input + 500 output |
|---|---:|---:|---:|
| DeepSeek | 2,20 USD | 8,50 USD | 10,85 USD trước điều chỉnh |
| Sol | 2,50 USD | 10,50 USD | 12,75 USD trước điều chỉnh |
| Astra | 10,00 USD | 50,00 USD | 55,00 USD trước điều chỉnh |

Bảng dùng tier ngắn dưới 272.000 token cho GPT. Snapshot cho thấy:

- DeepSeek có hệ số nhóm `model - china` 0.9 và hệ số giờ cao điểm 2x
  tại 01:00–04:00 và 06:00–10:00 UTC (08:00–11:00 và 13:00–17:00 Việt Nam).
- Sol có nhóm `codex plus` 0.6 hoặc `codex pro` 0.8.
- Astra có nhóm `codex pro` 0.8.

Chưa xác minh nhóm thực được chọn cho từng request của key hiện tại hoặc các
hệ số riêng của tài khoản. Vì vậy không khẳng định nâng lên Sol chắc chắn đắt
hơn hoặc rẻ hơn hóa đơn DeepSeek hiện tại. Output token thực tế của hai GPT ở
mẫu này ít hơn DeepSeek, nên so sánh chỉ đơn giá token sẽ không đủ.

## Phạm vi thay đổi và bước chuyển model

- Model catalog và chính các request QA đều xác nhận các ID trên gọi được qua
  Chat Completions tại Vibi, gồm tool calling. Chưa kiểm toán model thực phía sau
  relay hoặc thử trực tiếp endpoint OpenAI.
- `LLM_MODEL` là cấu hình mặc định cho Notebook và fallback cho Conversation AI. Đổi biến này
  sẽ tác động cả hai nếu không có override. @ai hiện có `CONVERSATION_AI_MODEL` và
  `CONVERSATION_AI_MAX_TOKENS` riêng; quota ghi nhận đúng model thực được gọi.
- Docker đọc `deploy/ai/.env`; file `backend/ai-service/.env` trong IDE dùng cho
  tiến trình chạy trực tiếp trên host.
- Model mạnh hơn không tự bổ sung lịch sử hỏi–đáp AI, streaming, tìm web hay đọc
  file vào chat. Những chức năng đó chưa được triển khai trong đợt đánh giá này.

## Chạy lại

Build AI Service bằng `npm run build`; chạy bộ chấm với
`node --test test/conversation-model-eval.test.cjs`.
Runner opt-in `scripts/evaluate-conversation-model.cjs --run --out FILE` dùng
`CONVERSATION_AI_MODEL` / `CONVERSATION_AI_MAX_TOKENS` của tiến trình (fallback về `LLM_MODEL` / `LLM_MAX_TOKENS`) và quota `admitModel` sẵn có. Không có `--run` thì
không gọi provider. Chỉ hỗ trợ origin đã cho phép `https://vibi.top` trong đợt này.

Đợt đo đã stage thư mục `dist` vào app QA riêng trong container, đặt
`AI_EVAL_APP_ROOT` tương ứng và `NODE_PATH=/app/node_modules`. Không đổi env của
API/worker đang phục vụ. Các thư mục tạm trong container đã mất khi recreate;
script và toàn bộ kết quả so sánh được giữ trong repository.

## Nguồn đối chiếu

- [OpenAI model selection](https://developers.openai.com/api/docs/guides/model-selection):
  Sol là hướng cân bằng cho công việc phức tạp; Astra dành cho mức chất lượng cao nhất.
- [OpenAI conversation state](https://developers.openai.com/api/docs/guides/conversation-state):
  ngữ cảnh hội thoại cần được đưa trở lại model.
- [Vibi model catalog](https://vibi.top/docs-setup/en/models): endpoint kiểm tra model của key.
- [NewAPI expression format](https://github.com/basellm/llm-metadata):
  giải thích hệ số giá USD/triệu token trong billing expression.


## Cấu hình gọn đã kích hoạt — 24/10/2026

Trong cả `backend/ai-service/.env` và `deploy/ai/.env`:

```dotenv
CONVERSATION_AI_MODEL=gpt-6.1-sol
CONVERSATION_AI_MAX_TOKENS=2048
```

Hai biến là tùy chọn: không đặt thì kế thừa `LLM_MODEL` và `LLM_MAX_TOKENS`.
Notebook tiếp tục dùng DeepSeek/4096. Quota dùng cùng các giá trị giới hạn như
trước, nhưng thống kê theo model thực; hai workload dùng cùng model thì chia
chung bộ đếm model đó. Không tăng quota trong đợt này.

Prompt mặc định yêu cầu trả lời gọn, thường dưới 150 từ; chỉ mở rộng khi được
hỏi chi tiết. Trần token áp dụng cho từng lượt gọi provider, không phải cam kết
mỗi câu trả lời luôn tiêu thụ đúng 2048 token. Câu hỏi cần tool vẫn có thể cần
hai lượt gọi. Lịch sử vẫn giới hạn tối đa 30 tin và chỉ đọc khi cần.

Đo lại đúng ba fixture, với prompt gọn và trần mới:

| Ca đạt | Độ trễ TB/ca | Request provider | Input token | Completion token |
|---|---:|---:|---:|---:|
| 3/3 | 4,28 giây | 4 | 1.276 | 318 |

Kết quả ở [gpt-6.1-sol-efficient.json](evaluation-results/gpt-6.1-sol-efficient.json).
So với 885 completion token của DeepSeek ở vòng trước, cấu hình Sol này dùng
ít hơn khoảng 64% trên ba fixture. Đây là so sánh cả cấu hình model + prompt;
không chứng minh mức tiết kiệm đó cho mọi câu hỏi hoặc hóa đơn thực.

Toàn bộ AI Service: 94/94 test qua. Test mới xác nhận override không sửa model
Notebook, fallback cũ vẫn hoạt động, admission dùng đúng model và vẫn chặn quota.

Kiểm thử trực tiếp sau khi kích hoạt: `node test/conversation-ai-live.cjs --run
--existing-server --browser` từ Communication Service đã qua 5 tình huống API:
câu hỏi chung trên kênh, tóm tắt 30/35 tin giả trên kênh, trả lời trong thread
kênh, câu hỏi chung trong tin riêng, tóm tắt thread tin riêng. Socket giao đúng
chat/thread; metadata follower và bộ đếm thread hợp lệ. Replay completion không
thêm dòng/event trùng; yêu cầu vượt rate limit bị rollback.

Chromium gửi mention @ai qua giao diện chat thật và nhận BROWSER_OK từ Sol;
không có pageErrors. Chỉ auth/profile của tài khoản QA được giả lập. HTTP 502
Calendar/Pomodoro do dịch vụ đó chưa chạy vẫn còn, nằm ngoài phần chat AI.
Fixture hội thoại và hồ sơ QA được runner dọn trong finally. API liveness 200;
không coi đây là xác nhận toàn bộ Notebook/Document stack đã sẵn sàng.
