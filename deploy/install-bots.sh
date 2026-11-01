#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo 'Run this installer with sudo.' >&2
  exit 1
fi

app_dir=$(cd "$(dirname "$0")/.." && pwd)
node_bin=$(command -v node || true)
if [[ -z $node_bin ]]; then
  echo 'Install Node.js 22 or newer before installing the bot services.' >&2
  exit 1
fi
node_major=$($node_bin -p 'process.versions.node.split(".")[0]')
if (( node_major < 22 )); then
  echo "Node.js 22 or newer is required; found $($node_bin --version)." >&2
  exit 1
fi

config=/etc/qadam/bots.env
if [[ ! -s $config ]]; then
  echo "Create $config with TELEGRAM_BOT_TOKEN and DISCORD_BOT_TOKEN first." >&2
  exit 1
fi
chmod 600 "$config"

if ! id qadam-bot &>/dev/null; then
  useradd --system --home-dir /var/lib/qadam-bot --create-home --shell /usr/sbin/nologin qadam-bot
fi

for name in telegram discord; do
  if [[ $name == telegram ]]; then
    entry=bot/index.mjs
  else
    entry=bot/discord.mjs
  fi
  cat > "/etc/systemd/system/qadam-${name}.service" <<UNIT
[Unit]
Description=QADAM ${name} bot
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=qadam-bot
Group=qadam-bot
WorkingDirectory=${app_dir}
EnvironmentFile=${config}
ExecStart=${node_bin} ${app_dir}/${entry}
Restart=on-failure
RestartSec=10
MemoryMax=350M
NoNewPrivileges=true
ProtectSystem=strict
StateDirectory=qadam-bot
StateDirectoryMode=0700
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
done

systemctl daemon-reload
systemctl enable --now qadam-telegram.service qadam-discord.service
systemctl --no-pager --full status qadam-telegram.service qadam-discord.service || true
