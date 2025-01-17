import { main } from "../../scripts/esbuild-client.mjs";

main({ external: ["vscode"] }).catch(e => {
  console.error(e);
  process.exit(1);
});
