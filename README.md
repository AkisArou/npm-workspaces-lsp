
shell`
 npm i -g npm-workspaces-lsp 
`

I use it in Neovim to get autocompletion for local npm workspaces in dependencies and devDependencies
```
-- Npm workspaces lsp
local c = vim.lsp.start_client({
  config = {
    cmd = { "npx", "npm-workspaces-lsp", "--stdio" },
  },
  name = "npm-workspaces-lsp",
  cmd = { "npx", "npm-workspaces-lsp", "--stdio" },
  root_dir = vim.loop.cwd(),
})

vim.api.nvim_create_autocmd({ "BufEnter", "BufWinEnter" }, {
  pattern = { "package.json" },
  callback = function()
    vim.lsp.buf_attach_client(0, c)
  end,
})
--
```
