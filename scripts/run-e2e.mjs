import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const mockBackend = spawn(process.execPath, ["tests/e2e/mock-backend.mjs"], {
  cwd: root,
  stdio: "inherit",
});

let stopping = false;

function stopMockBackend() {
  if (stopping) return;
  stopping = true;
  mockBackend.kill("SIGTERM");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopMockBackend();
    process.exitCode = 1;
  });
}

try {
  await waitUntilReady("http://127.0.0.1:3101/api/health", mockBackend);
  await run("npm", ["run", "build:e2e"]);
  await run("npx", ["playwright", "test"]);
} finally {
  stopMockBackend();
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? code})`));
    });
  });
}

async function waitUntilReady(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Mock backend exited before becoming ready (${child.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be binding its socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Mock backend did not become ready within 10 seconds");
}
