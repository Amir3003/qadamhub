# Run QADAM bots on the Oracle Micro VM

The website radar remains on Vercel + GitHub Actions. This VM runs only the two small bot processes. They make outbound HTTPS/WebSocket connections; no public HTTP port or ingress firewall rule is needed.

## Before connecting

- Ask the Oracle account owner for the VM **public IPv4 address**, OS image and whether your SSH public key was included. Use your own private SSH key only on your computer. Ubuntu's default SSH user is `ubuntu`; Oracle Linux's is `opc`.
- Ask the Telegram and Discord bot owners to regenerate any bot credentials previously committed to this public repo. Enter new tokens privately into the VM, never into GitHub, chat, screenshots, or the website. A Discord webhook URL is optional and is not a bot token.
- In the Discord Developer Portal, under the bot application's **Bot → Privileged Gateway Intents**, enable **Message Content Intent**. The bot's `!` commands need it. Ensure the bot is already invited to the server with permission to view and send messages.
- A Telegram bot can have only one `getUpdates` poller. Stop any old bot process before starting this one. A configured webhook must also be removed before polling.

## Install (the owner runs these on the VM)

1. SSH into the VM. For Ubuntu, the command on the computer with the private key is `ssh -i PATH_TO_PRIVATE_KEY ubuntu@PUBLIC_IP`. Use `opc@PUBLIC_IP` for Oracle Linux. Do not send the private key to anyone.
2. Install Node.js **22 or newer** system-wide from the [official Node.js downloads](https://nodejs.org/en/download) and verify `node --version`. For an **Ubuntu x86_64 Micro VM**, these commands install an official Node.js 24 binary and verify its SHA-256 checksum:

   ```bash
   sudo apt-get update && sudo apt-get install -y curl git xz-utils
   cd /tmp
   curl -fsSLO https://nodejs.org/dist/v24.22.0/node-v24.22.0-linux-x64.tar.xz
   curl -fsSLO https://nodejs.org/dist/v24.22.0/SHASUMS256.txt
   grep ' node-v24.22.0-linux-x64.tar.xz$' SHASUMS256.txt | sha256sum -c -
   sudo mkdir -p /opt/qadam-node
   sudo tar -xJf node-v24.22.0-linux-x64.tar.xz -C /opt/qadam-node --strip-components=1
   sudo ln -s /opt/qadam-node/bin/node /usr/local/bin/node
   node --version
   ```

   If the VM is not Ubuntu x86_64, use the appropriate binary for its OS and architecture. The bot processes use only built-in Node.js APIs, so `npm install`, Docker, the scanner, Nebius and Tavily keys are not required on the VM.
3. Clone the repository and create the root-only environment file:

   ```bash
   sudo git clone https://github.com/Amir3003/qadamhub.git /opt/qadam
   sudo install -d -m 700 /etc/qadam
   sudo nano /etc/qadam/bots.env
   ```

   Put these lines in the editor, replacing placeholders with newly issued values:

   ```dotenv
   TELEGRAM_BOT_TOKEN=YOUR_NEW_TELEGRAM_BOT_TOKEN
   BOT_USERNAME=QadamAgentBot
   DISCORD_BOT_TOKEN=YOUR_NEW_DISCORD_BOT_TOKEN
   WEB_APP_URL=https://www.qadamhub.com
   ```

   Do not add spaces around `=`. For optional `!broadcast`, also add `DISCORD_WEBHOOK_URL` and `DISCORD_BROADCAST_USER_ID`; do not add them otherwise.

4. Save the file, then run:

   ```bash
   sudo chmod 600 /etc/qadam/bots.env
   sudo node --env-file=/etc/qadam/bots.env /opt/qadam/deploy/telegram-remove-webhook.mjs
   sudo bash /opt/qadam/deploy/install-bots.sh
   ```

5. Check the logs and send `/start` and `/radar` to `@QadamAgentBot`; in the Discord server, send `!help` and `!radar`:

   ```bash
   sudo systemctl --no-pager status qadam-telegram qadam-discord
   sudo journalctl -u qadam-telegram -u qadam-discord -n 80 --no-pager
   ```

   `Active: active (running)` in systemd plus replies in both chats confirm the deployment. These services restart on failure and boot automatically. If Telegram logs `409 Conflict`, another poller is using the same bot token. If Discord logs close code `4014`, check Message Content Intent; if `4004`, check its token.

## Updating code

After a code change is merged to `main`, run `sudo git -C /opt/qadam pull --ff-only` and `sudo systemctl restart qadam-telegram qadam-discord`. The bots fetch the radar JSON from `https://www.qadamhub.com/data/opportunities.json` when someone uses `/radar` or `!radar` (override with `RADAR_DATA_URL`). Other bot features in this repository still contain example content; do not present CV scores or application drafts as verified personalized results.

## If the repository is private

A private repository needs a credential on the VM before `git pull` works. Use a read-only deploy key:

1. On the VM: `sudo ssh-keygen -t ed25519 -N "" -f /root/.ssh/qadam_deploy` and `sudo cat /root/.ssh/qadam_deploy.pub`.
2. On GitHub: repository, Settings, Deploy keys, Add deploy key. Paste the public key, leave "Allow write access" off.
3. On the VM, point the clone at SSH with that key:

   ```bash
   sudo git -C /opt/qadam remote set-url origin git@github.com:Amir3003/qadamhub.git
   sudo git -C /opt/qadam config core.sshCommand "ssh -i /root/.ssh/qadam_deploy -o IdentitiesOnly=yes"
   sudo git -C /opt/qadam pull --ff-only
   ```

If the repository is renamed, use the new name in `set-url`. Pull the radar change (bots reading the feed from the site) before the repository goes private; otherwise `/radar` fails until the next pull.

## Telegram notifications (daily message and deadline reminders)

The Telegram bot now sends messages to people who asked for them (`/subscribe`, or the Track button under a listing in `/radar`): a daily note at 09:00 Astana time (04:00 UTC) about new listings, reminders 7, 3 and 1 day before the deadline of tracked listings, and, on the 1st of a month, a note that a tracked yearly program usually opens. The bot saves the chat id and the tracked listing ids in `/var/lib/qadam-bot/telegram-state.json` (mode 600); `/unsubscribe` deletes a person's record. It reads the radar and the catalog from the site, so no new keys are needed.

After merging this change run these on the VM, because the service unit gained `StateDirectory=qadam-bot` (a writable state folder under `ProtectSystem=strict`):

```
sudo git -C /opt/qadam pull --ff-only
sudo bash /opt/qadam/deploy/install-bots.sh
sudo systemctl restart qadam-telegram qadam-discord
```

Check with `journalctl -u qadam-telegram -n 30`: the line `Saved state: 0 chats` confirms the state file is readable, and after 04:00 UTC a `[Daily Run]` line appears once a day. Back up or ignore the state file as you prefer; losing it only means people must subscribe again.

