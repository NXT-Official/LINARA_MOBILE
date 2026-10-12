import { describe, expect, it } from "vitest";

import { sentryUserFor } from "./identity";

describe("sentryUserFor", () => {
  it("keeps the account's opaque id and nothing else", () => {
    const session = {
      access_token: "eyJ.secret.token",
      user: {
        id: "0b5c6f1e-2a4d-4c8e-9f10-6a7b8c9d0e1f",
        email: "ana@example.com",
        phone: "09171234567",
        user_metadata: { full_name: "Ana Cruz" },
      },
    };
    expect(sentryUserFor(session)).toEqual({ id: "0b5c6f1e-2a4d-4c8e-9f10-6a7b8c9d0e1f" });
  });

  it("is null when signed out", () => {
    expect(sentryUserFor(null)).toBeNull();
  });
});
