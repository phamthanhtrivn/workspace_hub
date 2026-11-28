import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { UserAvatar } from "@/components/common/user-avatar";
import authReducer, { setCredentials } from "@/store/auth/auth-slice";
import { USER_ROLES } from "@/features/auth/types/auth.constants";
import { MeetingPreJoin } from "./meeting-prejoin";

for (const avatarUrl of ["https://example.com/avatar.png", null]) {
  test(`camera-off prejoin uses the shared avatar with ${avatarUrl ? "a saved photo" : "the user icon"}`, () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(
      setCredentials({
        accessToken: "test-token",
        userId: "current-user",
        email: "user@example.com",
        role: USER_ROLES.USER,
        avatarUrl,
      }),
    );
    let tree: React.ReactElement;
    function Harness() {
      tree = MeetingPreJoin({
        settings: {
          cameraEnabled: false,
          microphoneEnabled: false,
          cameraDeviceId: "",
          microphoneDeviceId: "",
          autoAdmin: false,
          chatEnabled: true,
        },
        cameras: [],
        microphones: [],
        previewStream: null,
        isPreviewLoading: false,
        permissionError: null,
        onSettingsChange() {},
        stopPreview() {},
        onCancel() {},
        onStart() {},
      });

      return null;
    }
    renderToStaticMarkup(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );
    function findAvatar(
      node: React.ReactNode,
    ): React.ReactElement<React.ComponentProps<typeof UserAvatar>> | undefined {
      for (const child of React.Children.toArray(node)) {
        if (!React.isValidElement<{ children?: React.ReactNode }>(child))
          continue;
        if (child.type === UserAvatar)
          return child as React.ReactElement<
            React.ComponentProps<typeof UserAvatar>
          >;
        const match = findAvatar(child.props.children);
        if (match) return match;
      }
    }
    const avatar = findAvatar(tree!);
    assert.ok(avatar);
    assert.equal(avatar.props.src, avatarUrl);
  });
}
