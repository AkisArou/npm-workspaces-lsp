vim.cmd([[set runtimepath+=.nvim]])

local ok, overseer = pcall(require, "overseer")

if ok then
	overseer.run_template({ name = "ts:watch" })
end
