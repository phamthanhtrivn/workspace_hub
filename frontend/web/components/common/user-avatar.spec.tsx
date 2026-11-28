import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import authReducer from "@/store/auth/auth-slice";
import StorageImage from "./storage-image";
import { UserAvatar } from "./user-avatar";

test("a failed user photo switches to the existing user icon without leaving a broken image", (context) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const client = new QueryClient();
  context.after(() => client.clear());
  let avatar: ReturnType<typeof UserAvatar>;
  function Harness() {
    avatar = UserAvatar({
      src: "https://example.com/unavailable.png",
      alt: "Participant",
    });

    return null;
  }
  renderToStaticMarkup(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    </Provider>,
  );
  const photo = avatar!.props.children;
  assert.ok(React.isValidElement<{ src: string }>(photo));
  assert.equal(typeof photo.type, "function");
  const Photo = photo.type as (
    props: typeof photo.props,
  ) => React.ReactElement<{ children?: React.ReactNode }>;
  let status = "loaded";
  context.mock.method(React, "useState", () => [
    status,
    (value: string) => {
      status = value;
    },
  ]);
  const loaded = Photo(photo.props);
  const image = React.Children.toArray(loaded.props.children).find(
    (child) => React.isValidElement(child) && child.type === StorageImage,
  );
  assert.ok(React.isValidElement<{ onError: () => void }>(image));
  image.props.onError();
  assert.equal(status, "error");
  const markup = renderToStaticMarkup(Photo(photo.props));
  assert.ok(markup.includes("lucide-user-round"));
  assert.ok(!markup.includes("<img"));
});
