import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, type AxiosResponse } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { store } from "@/store/store";
import { useChatMessageActions } from "./useChatMessageActions";
import { ChatContextType, type ChatMessageResponse } from "../../types/chat.types";
import { createComposerSendController } from "../../utils/composer-send";

function getActions(isDirect: boolean, append: (message: ChatMessageResponse) => void) {
  const captured: { current?: ReturnType<typeof useChatMessageActions> } = {};
  function Harness() {
    captured.current = useChatMessageActions({
      conversationId: "conversation", isDirectConversation: isDirect,
      activeChatType: isDirect ? ChatContextType.DIRECT_MESSAGE : ChatContextType.CHANNEL,
      jumpTargetId: null, appendRealtimeMessage: append, scrollToBottom() {},
    });
    return null;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderToStaticMarkup(<Provider store={store}><QueryClientProvider client={client}><Harness /></QueryClientProvider></Provider>);
  return captured.current!;
}

for (const direct of [false, true]) {
  test(`${direct ? "direct" : "channel"} send waits for the server and appends before clearing the composer`, async (context) => {
    const originalAdapter = api.defaults.adapter;
    context.after(() => { api.defaults.adapter = originalAdapter; });
    const response = Promise.withResolvers<AxiosResponse>();
    const appended: string[] = [];
    let cleared = 0;
    api.defaults.adapter = (config) => response.promise.then((value) => ({ ...value, config }));
    const actions = getActions(direct, (message) => appended.push(message.id));
    const sender = createComposerSendController();
    const pending = sender.run(() => actions.handleSendMessage("File", [{ name: "report.pdf", mimeType: "application/pdf", sizeBytes: 8, s3Key: "chat/conversation/report.pdf" }]), () => {
      assert.deepEqual(appended, ["sent"]);
      cleared++;
    });
    assert.equal(sender.getSnapshot(), true);
    assert.equal(cleared, 0);
    response.resolve({ status: 200, statusText: "OK", config: {} as AxiosResponse["config"], headers: {}, data: { success: true, data: { id: "sent" } } });
    assert.equal(await pending, true);
    assert.equal(cleared, 1);
  });

  test(`${direct ? "direct" : "channel"} send and edit failures return false and retain the composer`, async (context) => {
    const originalAdapter = api.defaults.adapter;
    context.after(() => { api.defaults.adapter = originalAdapter; });
    const notices = context.mock.method(toast, "error", () => 0);
    let appended = 0;
    let editDone = 0;
    api.defaults.adapter = async (config) => {
      throw new AxiosError("Unavailable", "ERR_BAD_RESPONSE", config, undefined, {
        status: 503, statusText: "Unavailable", config, headers: {}, data: { message: "Unavailable" },
      });
    };
    const actions = getActions(direct, () => { appended++; });
    assert.equal(await actions.handleSendMessage("Keep this draft"), false);
    assert.equal(await actions.handleSendMessage("Keep this edit", undefined, undefined, { id: "edit" } as ChatMessageResponse, () => { editDone++; }), false);
    assert.equal(appended, 0);
    assert.equal(editDone, 0);
    assert.equal(notices.mock.callCount(), 2);
  });
}
