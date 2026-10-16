import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { imageDeliveryUrl, r2ObjectKeyFromPublicUrl } from "../src/features/media/delivery-url";

const base = "https://pub-example.r2.dev/";
const key = "projects/23491393-ef37-4868-b356-7c1f6377c30b/0f6347ea-852f-46b3-9820-4769a740d0b6.webp";
const source = `${base}${key}`;

describe("R2 media delivery", () => {
  test("proxies r2.dev images only in development", () => {
    assert.equal(imageDeliveryUrl(source, false), source);
    assert.equal(imageDeliveryUrl(source, true), `/api/media/r2?url=${encodeURIComponent(source)}`);
    assert.equal(imageDeliveryUrl("https://media.example.com/image.webp", true), "https://media.example.com/image.webp");
  });

  test("accepts only exact configured R2 object URLs and supported keys", () => {
    assert.equal(r2ObjectKeyFromPublicUrl(source, base), key);
    assert.equal(r2ObjectKeyFromPublicUrl(source, "https://other.r2.dev/"), null);
    assert.equal(r2ObjectKeyFromPublicUrl(`${source}?download=1`, base), null);
    assert.equal(r2ObjectKeyFromPublicUrl(`${base}projects/not-a-uuid/file.webp`, base), null);
    assert.equal(r2ObjectKeyFromPublicUrl(`${base}projects/23491393-ef37-4868-b356-7c1f6377c30b/file.svg`, base), null);
  });
});
