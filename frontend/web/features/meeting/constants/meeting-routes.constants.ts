export enum MeetingRouteSegment {
  MEETINGS = "meetings",
}

export enum MeetingWindowTarget {
  NEW_TAB = "_blank",
}

export const meetingRoutes = {
  listPath: `/${MeetingRouteSegment.MEETINGS}`,
  joinPath: (joinToken: string) =>
    `/${MeetingRouteSegment.MEETINGS}/${joinToken}`,
  joinUrl: (joinToken: string) => {
    if (typeof window === "undefined") {
      return `/${MeetingRouteSegment.MEETINGS}/${joinToken}`;
    }
    return `${window.location.origin}/${MeetingRouteSegment.MEETINGS}/${joinToken}`;
  },
};
