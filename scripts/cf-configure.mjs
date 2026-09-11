/* M10 部署步骤 1：PATCH Pages 构建配置（Vite 化）+ NODE_VERSION。
   用法：node scripts/cf-configure.mjs <account_id>
   Token 从环境变量 CLOUDFLARE_API_TOKEN 读（不落盘不回显）。 */
const [accountId] = process.argv.slice(2)
const token = process.env.CLOUDFLARE_API_TOKEN
if (!accountId || !token) { console.error('need account_id + CLOUDFLARE_API_TOKEN'); process.exit(2) }

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/personal-workbench`

const get = await fetch(base, { headers: { Authorization: `Bearer ${token}` } })
const cur = await get.json()
if (!cur.success) { console.error('GET failed:', JSON.stringify(cur.errors)); process.exit(1) }
const prodEnv = cur.result.deployment_configs?.production?.env_vars || {}

const patch = {
  build_config: {
    build_command: 'npm run build',
    destination_dir: 'dist',
    root_dir: '',
  },
  deployment_configs: {
    production: {
      /* 保留既有 SUPABASE 变量（仅回写名字对应的现有值），新增 NODE_VERSION */
      env_vars: {
        ...prodEnv,
        NODE_VERSION: { type: 'plain_text', value: '22' },
      },
    },
  },
}

const resp = await fetch(base, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patch),
})
const out = await resp.json()
if (!out.success) { console.error('PATCH failed:', JSON.stringify(out.errors)); process.exit(1) }
const bc = out.result.build_config
console.log('build_command:', bc.build_command)
console.log('destination_dir:', bc.destination_dir)
console.log('production env names:', Object.keys(out.result.deployment_configs?.production?.env_vars || {}).sort().join(','))
