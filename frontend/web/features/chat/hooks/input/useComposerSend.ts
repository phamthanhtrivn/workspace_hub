"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { CHAT_COMPOSER_MESSAGES } from "../../constants/composer.constants";
import { createComposerSendController } from "../../utils/composer-send";

export function useComposerSend(contextKey: string | null | undefined) {
  const controller = useMemo(() => createComposerSendController(contextKey), [contextKey]);
  const isSending = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => false);
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);

  const send = useCallback(async (request: () => Promise<boolean>, confirmed: () => void) => {
    try {
      return await controller.run(request, confirmed);
    } catch (error) {
      if (controller.isActive()) toast.error(getActionErrorMessage(error, CHAT_COMPOSER_MESSAGES.sendFailed));
      return false;
    }
  }, [controller]);
  return { isSending, send };
}
