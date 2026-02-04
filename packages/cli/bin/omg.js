#!/usr/bin/env node
import("../dist/index.js").catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
