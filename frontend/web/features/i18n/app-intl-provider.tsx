"use client";

import { useEffect } from "react";
import { IntlProvider } from "react-intl";
import { useAppSelector } from "@/store/store";
import { useUserSettingsQuery } from "@/features/user-setting/hooks/useUserSettingQueries";
import {
  AppLocale,
  DEFAULT_LOCALE,
  isAppLocale,
} from "@/features/i18n/locales";
import { messages } from "@/features/i18n/messages";

function resolveLocale(language: string | undefined): AppLocale {
  return isAppLocale(language) ? language : DEFAULT_LOCALE;
}

export default function AppIntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const { data: settingsResponse } = useUserSettingsQuery({
    enabled: Boolean(accessToken),
  });
  const locale = resolveLocale(settingsResponse?.data.language);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider
      defaultLocale={DEFAULT_LOCALE}
      locale={locale}
      messages={messages[locale]}
      onError={() => undefined}
    >
      {children}
    </IntlProvider>
  );
}
