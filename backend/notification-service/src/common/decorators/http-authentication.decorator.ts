import { SetMetadata } from "@nestjs/common";

export const HTTP_AUTHENTICATION = "httpAuthentication";
/** The handler authenticates independently (service credential or provider signature). */
export const IndependentAuthentication = () =>
  SetMetadata(HTTP_AUTHENTICATION, "independent");
export const Public = () => SetMetadata(HTTP_AUTHENTICATION, "public");
export const OptionalIdentity = () =>
  SetMetadata(HTTP_AUTHENTICATION, "optional");
