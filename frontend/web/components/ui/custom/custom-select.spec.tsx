import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomSelect } from "./custom-select";

const options = [
  { value: "restricted", label: "Restricted" },
  { value: "viewer", label: "Anyone with the link (Viewer)" },
];

test("option-sized selects account for the longest label before opening", () => {
  const html = renderToStaticMarkup(
    <CustomSelect
      ariaLabel="Link access"
      value="restricted"
      options={options}
      onChange={() => {}}
      sizeToOptions
    />,
  );
  assert.match(html, /Anyone with the link \(Viewer\)/);
  assert.match(html, /aria-hidden="true"[^>]*data-slot="select-width-sizer"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-label="Link access"/);
});

test("existing selects keep their current sizing unless explicitly enabled", () => {
  const html = renderToStaticMarkup(
    <CustomSelect
      ariaLabel="Link access"
      value="restricted"
      options={options}
      onChange={() => {}}
    />,
  );
  assert.doesNotMatch(html, /data-slot="select-width-sizer"/);
});

test("option sizing supports existing option children and disabled choices", () => {
  const html = renderToStaticMarkup(
    <CustomSelect
      ariaLabel="Share permission"
      value="view"
      onChange={() => {}}
      sizeToOptions
    >
      <option value="view">Can view</option>
      <option value="edit" disabled>
        Can edit and manage access
      </option>
    </CustomSelect>,
  );
  assert.match(html, /Can edit and manage access/);
  assert.match(html, /aria-hidden="true"[^>]*data-slot="select-width-sizer"/);
});
