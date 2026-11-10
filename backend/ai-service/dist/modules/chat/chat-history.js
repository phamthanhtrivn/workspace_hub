"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationHistory = conversationHistory;
exports.isFollowUp = isFollowUp;
exports.retrievalQuestion = retrievalQuestion;
function conversationHistory(messages, selected) {
    const revisions = new Map(selected
        .filter((source) => source.status === "READY")
        .map((source) => [source.id, source.revision]));
    const turns = [];
    let user = null;
    for (const message of messages) {
        if (!message.sources?.length ||
            !message.sources.every((ref) => revisions.get(ref.id) === ref.revision)) {
            user = null;
            continue;
        }
        const content = message.content
            .replace(/\[\[S\d+\]\]/g, "")
            .trim()
            .slice(0, 1000);
        if (!content) {
            user = null;
            continue;
        }
        if (message.role === "USER")
            user = { role: "user", content };
        else if (message.role === "ASSISTANT" && user) {
            turns.push(user, { role: "assistant", content });
            user = null;
        }
    }
    return turns.slice(-6);
}
function isFollowUp(question) {
    return (/\b(it|that|these|those|more|explain further)\b|(?:cái|điều|phần|ý) (?:đó|này)|giải thích thêm|nói rõ hơn|còn .* thì sao/i.test(question) ||
        /^(giải thích đi|là sao|ý là sao|explain|explain this)[?.!\s]*$/i.test(question.trim()));
}
function retrievalQuestion(question, history) {
    if (!history.length || !isFollowUp(question))
        return question;
    const previous = history.filter((turn) => turn.role === "user").at(-1);
    return previous ? `${question}\n${previous.content}` : question;
}
