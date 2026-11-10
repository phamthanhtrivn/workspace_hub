"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greetingReply = greetingReply;
exports.immediateReply = immediateReply;
exports.generateChatResponse = generateChatResponse;
const citation_check_1 = require("./citation-check");
const llm_client_1 = require("../../infrastructure/integrations/llm.client");
const chat_history_1 = require("./chat-history");
function normalizedQuestion(question) {
    return question
        .normalize("NFC")
        .trim()
        .toLowerCase()
        .replace(/[!?.…,]+$/u, "")
        .trim()
        .replace(/\s+/g, " ");
}
function greetingReply(question) {
    const text = normalizedQuestion(question);
    if (/^(hello|hi|hey|hi there|hello there)$/.test(text))
        return "Hello! What would you like to ask about your documents?";
    if (/^(xin chào|chào|chào bạn|chào bot|chào ai|chao|xin chao|chao ban)$/.test(text))
        return "Chào bạn! Bạn muốn hỏi gì về tài liệu?";
    return null;
}
function immediateReply(question) {
    const greeting = greetingReply(question);
    if (greeting)
        return greeting;
    const text = normalizedQuestion(question);
    const plain = text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
    if (/^(ban (co the |)(lam (gi|duoc gi)|giup (gi|duoc gi))|ban co (kha nang|chuc nang) gi|chuc nang cua ban la gi)( voi tai lieu)?$/.test(plain))
        return "Mình có thể giúp bạn tóm tắt, giải thích, so sánh và trả lời câu hỏi dựa trên tài liệu trong notebook, kèm trích dẫn khi dùng thông tin từ nguồn. Bạn muốn bắt đầu với việc nào?";
    if (/^(what can you do|what can you help (me )?with|how can you help( me)?|what are your (capabilities|features))$/.test(text))
        return "I can help summarize, explain, compare, and answer questions about your notebook documents, with citations when using source information. What would you like to start with?";
    if (/^(giải thích( đi)?|nói rõ hơn|cái này|cái đó|là sao|ý là sao|giúp mình|giúp tôi)$/.test(text))
        return "Bạn muốn mình giải thích nội dung hoặc phần nào của tài liệu?";
    if (/^(explain( please)?|explain this|what do you mean|help( me)?)$/.test(text))
        return "Which topic or part of the documents would you like help with?";
    return null;
}
function validateClarification(content) {
    const text = content.trim();
    if (text.length > 300 || !/[?？]$/.test(text) || /[\r\n]|\[\[/.test(text))
        throw new Error("Câu hỏi làm rõ không hợp lệ");
}
async function generateChatResponse(question, evidence, signal, emit, history = [], images = []) {
    const reply = history.length && (0, chat_history_1.isFollowUp)(question) ? null : immediateReply(question);
    if (reply || !evidence.length) {
        const content = reply ??
            "Chưa tìm thấy thông tin phù hợp trong những nguồn đã chọn. Bạn muốn hỏi cụ thể nội dung nào hoặc bổ sung tài liệu nào?";
        signal.throwIfAborted();
        emit(content);
        return { content, citations: [] };
    }
    let content = "";
    let clarification = false;
    for await (const delta of (0, llm_client_1.modelAnswer)(question, evidence, signal, {
        history,
        images,
        onClarification: () => {
            clarification = true;
        },
    })) {
        signal.throwIfAborted();
        content += delta;
        if (content.length > (clarification ? 300 : 20000))
            throw new Error("Câu trả lời quá dài");
        if (!clarification)
            emit(delta);
    }
    signal.throwIfAborted();
    if (clarification) {
        validateClarification(content);
        emit(content);
    }
    if (clarification)
        return { content, citations: [] };
    const checked = (0, citation_check_1.inspectAnswerCitations)(content, evidence);
    if (checked.uncitedBlocks.length) {
        const note = "\n\nLưu ý: Một số đoạn chưa có trích dẫn trực tiếp. Bạn nên đối chiếu với nguồn trước khi sử dụng.";
        content += note;
        emit(note);
    }
    return { content, citations: checked.citations };
}
