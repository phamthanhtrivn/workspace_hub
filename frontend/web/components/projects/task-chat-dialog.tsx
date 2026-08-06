"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { Task } from "@/types/project";

export default function TaskChatDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: number; content: string; time: string }>>([]);

  if (!task) return null;

  const handleSend = () => {
    const content = message.trim();
    if (!content) return;
    setMessages((current) => [...current, { id: Date.now(), content, time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) }]);
    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div className="flex h-[min(620px,85vh)] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chat của task</p><h2 className="truncate text-sm font-black text-[#172B4D]">{task.title}</h2></div></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng chat"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4">
          {messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle className="h-9 w-9 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">Chưa có tin nhắn</p><p className="mt-1 max-w-xs text-[11px] font-semibold text-slate-400">Đây là giao diện chat mẫu cho Task/Subtask. Tin nhắn chưa kết nối backend.</p></div> : <div className="space-y-3">{messages.map((item) => <div key={item.id} className="ml-auto max-w-[82%] rounded-lg bg-blue-600 px-3 py-2 text-white shadow-sm"><p className="text-xs font-medium">{item.content}</p><p className="mt-1 text-right text-[9px] font-semibold text-blue-100">{item.time}</p></div>)}</div>}
        </div>
        <div className="border-t border-slate-200 p-3"><div className="flex items-end gap-2"><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }} rows={2} placeholder="Nhập tin nhắn..." className="min-h-10 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-blue-500" /><button type="button" onClick={handleSend} disabled={!message.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Gửi"><Send className="h-4 w-4" /></button></div><p className="mt-1.5 text-[10px] font-semibold text-slate-400">Enter để gửi · Shift + Enter xuống dòng</p></div>
      </div>
    </div>
  );
}
