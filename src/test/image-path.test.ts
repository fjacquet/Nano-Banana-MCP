import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { validateImagePath } from "../image-path.js";

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "nb-path-"));
});
afterAll(() => fs.rm(dir, { recursive: true, force: true }));

describe("validateImagePath", () => {
  test("accepts a small png", async () => {
    const file = path.join(dir, "ok.png");
    await fs.writeFile(file, "x");
    await expect(validateImagePath(file)).resolves.toBeUndefined();
  });

  test("rejects a non-image extension", async () => {
    const file = path.join(dir, "notes.txt");
    await fs.writeFile(file, "x");
    await expect(validateImagePath(file)).rejects.toThrow(/Unsupported/);
  });

  test("rejects a symlink that points outside the allowed roots", async () => {
    const link = path.join(dir, "link.png");
    await fs.symlink("/etc/hosts", link);
    await expect(validateImagePath(link)).rejects.toThrow(/outside allowed/);
  });

  test("rejects a file over 20MB", async () => {
    const file = path.join(dir, "big.png");
    await fs.writeFile(file, "");
    await fs.truncate(file, 21 * 1024 * 1024);
    await expect(validateImagePath(file)).rejects.toThrow(/too large/);
  });
});
