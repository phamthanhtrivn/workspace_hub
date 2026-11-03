import { combineReducers, configureStore, type UnknownAction } from "@reduxjs/toolkit";
import authReducer, { clearCredentials, setCredentials } from "./auth/auth-slice";
import chatReducer from "./chat/chat-slice";
import notificationReducer from "@/store/notification/notification.slice";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

const applicationReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  notification: notificationReducer,
});

type ApplicationState = ReturnType<typeof applicationReducer>;

function rootReducer(state: ApplicationState | undefined, action: UnknownAction): ApplicationState {
  const identityChanged = clearCredentials.match(action) ||
    (setCredentials.match(action) && state?.auth.userId !== action.payload.userId);
  return applicationReducer(identityChanged ? undefined : state, action);
}

export const store = configureStore({ reducer: rootReducer });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
