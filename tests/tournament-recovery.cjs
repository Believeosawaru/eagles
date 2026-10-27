const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const appRequire = createRequire(path.join(root, "app/package.json"));
const serverRequire = createRequire(path.join(root, "server/package.json"));
const esbuild = serverRequire("esbuild");
const output = path.join(
  root,
  "app/node_modules/.cache/eagles-tests/recovery.cjs",
);
fs.mkdirSync(path.dirname(output), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, "tournament-recovery.entry.tsx")],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  alias: { "react-native": "react-native-web" },
  external: ["react", "react/*", "react-dom", "react-native-web"],
  nodePaths: [path.join(root, "app/node_modules")],
});
const { RecoveryCase } = require(output);
const React = appRequire("react");
const { renderToString } = appRequire("react-dom/server");
for (const [label, result, index] of [
  ["missing result", undefined, 0],
  ["legacy result", { matches: [] }, 0],
  ["missing fixture array", { tournament: {} }, 0],
  ["null fixture array", { tournament: { fixtures: null } }, 0],
  ["empty fixtures", { tournament: { fixtures: [] } }, 0],
  [
    "stale match index",
    { tournament: { fixtures: [{ id: 0, nigeriaIndex: 0 }] } },
    99,
  ],
]) {
  test("tournament recovers safely: " + label, () => {
    const html = renderToString(
      React.createElement(RecoveryCase, { result, index }),
    );
    assert.match(html, /rebuild your tournament/);
    assert.match(html, /Rebuild tournament/);
    assert.doesNotMatch(html, /The world is watching/);
  });
}
test("null fixture elements render recovery rather than another error", () => {
  const html = renderToString(
    React.createElement(RecoveryCase, {
      result: { tournament: { champion: "Nigeria", fixtures: [null] } },
      index: 0,
    }),
  );
  assert.match(html, /Rebuild tournament/);
});
test("valid tournament still renders the real hub", () => {
  const result = {
    tournament: {
      champion: "Nigeria",
      fixtures: [
        {
          id: 0,
          nigeriaIndex: 0,
          stage: "Group · 1",
          group: 0,
          homeTeam: "Nigeria",
          awayTeam: "Ecuador",
          home: 0,
          away: 0,
          penalties: null,
          goals: [],
        },
      ],
    },
  };
  const html = renderToString(
    React.createElement(RecoveryCase, { result, index: 0 }),
  );
  assert.match(html, /The world is watching/);
  assert.doesNotMatch(html, /Rebuild tournament/);
});
