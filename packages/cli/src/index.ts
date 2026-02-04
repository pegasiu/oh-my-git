#!/usr/bin/env node
import { createNodeEnv, createNodeFs, createNodeShell } from "./adapters/node";
import { createCli } from "./cli/index.tsx";

const cli = createCli({
  fs: createNodeFs(),
  env: createNodeEnv(),
  shell: createNodeShell(),
});

cli.runCli(process.argv).catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
