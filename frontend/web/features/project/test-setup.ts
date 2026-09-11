import { vi } from "vitest";

vi.mock("@/features/i18n/useAppIntl", async () => {
  const [{ createIntl }, { default: messages }] = await Promise.all([
    import("react-intl"),
    import("@/features/i18n/messages/en"),
  ]);
  const intl = createIntl({ locale: "en", messages });
  return { useAppIntl: () => intl };
});
