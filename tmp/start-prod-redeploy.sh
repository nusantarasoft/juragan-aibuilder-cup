#!/usr/bin/env bash
set -euo pipefail
cd /opt/nusantarasoft-3
nohup bash -lc 'cd /opt/nusantarasoft-3 && bash scripts/master-production/redeploy.sh' \
  > /tmp/nsoft3-redeploy.log 2>&1 &
echo "STARTED_PID=$!"
sleep 2
head -n 20 /tmp/nsoft3-redeploy.log || true
