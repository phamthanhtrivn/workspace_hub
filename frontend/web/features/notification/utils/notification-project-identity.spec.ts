import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";
import { api } from "@/lib/axios";
import { getAccessibleProjectIdentity } from "@/features/project/api/project.api";
import { getNotificationProjectIdentity } from "./notification-project-identity";

const projectId = "00000000-0000-4000-8000-000000000001";
const notification = {
  recipientId: "recipient",
  metadata: {
    projectId,
    projectName: "Old name",
    projectIcon: "🎯",
    projectColor: "#22396f",
  },
};

test("current project icon and color override historical metadata; old notifications without icon metadata are enriched", () => {
  const current = {
    id: projectId,
    name: "New name",
    icon: "🚀",
    color: "#16a34a",
  };
  for (const source of [
    notification,
    { ...notification, metadata: { projectId } },
  ]) {
    const identity = getNotificationProjectIdentity(source, current);
    assert.equal(identity.projectIcon, "🚀");
    assert.equal(identity.projectColor, "#16a34a");
    assert.equal(identity.projectName, "New name");
  }
});

test("an inaccessible project falls back to saved metadata and a cleared current icon does not revive an old icon", () => {
  assert.equal(
    getNotificationProjectIdentity(notification, null).projectIcon,
    "🎯",
  );
  assert.equal(
    getNotificationProjectIdentity(notification, {
      id: projectId,
      name: "Project",
      icon: "",
    }).projectIcon,
    undefined,
  );
  assert.equal(
    getNotificationProjectIdentity(
      { recipientId: "recipient", metadata: { projectId } },
      null,
    ).projectIcon,
    undefined,
  );
});

test("a different project's identity and malformed project IDs cannot replace notification metadata", () => {
  const other = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Other",
    icon: "🚀",
  };
  assert.equal(
    getNotificationProjectIdentity(notification, other).projectIcon,
    "🎯",
  );
  assert.equal(
    getNotificationProjectIdentity({
      recipientId: "recipient",
      metadata: { projectId: "invalid" },
    }).projectId,
    undefined,
  );
});

test("identity requests use the protected project API, treating forbidden and missing projects as unavailable", async (context) => {
  const original = api.defaults.adapter;
  context.after(() => {
    api.defaults.adapter = original;
  });
  let status = 200;
  let id = projectId;
  api.defaults.adapter = (config) => {
    assert.ok(config.url?.endsWith(`/api/projects/${projectId}`));
    if (config.validateStatus && !config.validateStatus(status)) {
      return Promise.reject(
        new AxiosError(
          "Request failed",
          "ERR_BAD_RESPONSE",
          config,
          undefined,
          { config, status, statusText: "Failure", headers: {}, data: {} },
        ),
      );
    }

    return Promise.resolve({
      config,
      status,
      statusText: "OK",
      headers: {},
      data: {
        success: true,
        data: { id, name: "Project", icon: "🚀", color: "#16a34a" },
      },
    });
  };
  assert.equal((await getAccessibleProjectIdentity(projectId))?.icon, "🚀");
  for (status of [403, 404])
    assert.equal(await getAccessibleProjectIdentity(projectId), null);
  for (status of [401, 503])
    await assert.rejects(getAccessibleProjectIdentity(projectId));
  status = 200;
  id = "00000000-0000-4000-8000-000000000002";
  await assert.rejects(
    getAccessibleProjectIdentity(projectId),
    /does not match/,
  );
});
