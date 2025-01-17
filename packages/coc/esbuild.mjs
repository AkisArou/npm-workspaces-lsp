import { main } from "../../scripts/esbuild-client.mjs";

main({ external: ["coc.nvim"] }).catch(e => {
  console.error(e);
  process.exit(1);
});
