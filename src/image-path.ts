import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { ALLOWED_IMAGE_EXTENSIONS } from "./image-mime.js";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function validateImagePath(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Unsupported image format "${ext}". Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
    );
  }

  let stats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stats = await fs.stat(resolved);
  } catch {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Image file not found: ${filePath}`,
    );
  }

  // Canonicalize to defeat symlink-based escapes, then sandbox-check.
  let realPath: string;
  try {
    realPath = await fs.realpath(resolved);
  } catch {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Image file not accessible: ${filePath}`,
    );
  }

  if (!(await isPathInAllowedRoots(realPath))) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Image path is outside allowed roots (home directory, current working directory, or system tmpdir). System file access is blocked.`,
    );
  }

  if (stats.size > MAX_IMAGE_SIZE_BYTES) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Image file too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
    );
  }
}

function getAllowedPathRoots(): string[] {
  const roots: string[] = [
    path.resolve(os.homedir()),
    path.resolve(os.tmpdir()),
  ];
  const cwd = path.resolve(process.cwd());
  const SYSTEM_PREFIXES = [
    "/usr/",
    "/etc",
    "/var/",
    "/proc",
    "/sys",
    "/dev",
    "/root",
    "/boot",
  ];
  if (
    cwd !== "/" &&
    !SYSTEM_PREFIXES.some(
      (p) => cwd === p.replace(/\/$/, "") || cwd.startsWith(p),
    )
  ) {
    roots.push(cwd);
  }
  return roots;
}

async function isPathInAllowedRoots(resolved: string): Promise<boolean> {
  // realPath is canonical, so canonicalize the roots too (macOS tmpdir is a symlink).
  const roots = await Promise.all(
    getAllowedPathRoots().map((r) => fs.realpath(r).catch(() => r)),
  );
  return roots.some((root) => {
    if (resolved === root) return true;
    const prefix = root.endsWith(path.sep) ? root : root + path.sep;
    return resolved.startsWith(prefix);
  });
}
