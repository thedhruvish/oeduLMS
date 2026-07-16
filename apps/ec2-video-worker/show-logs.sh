#!/bin/bash

echo "============================================="
echo "       OeduLMS Video Worker Log Viewer"
echo "============================================="
echo ""

if [ -f /var/log/video-worker.log ]; then
  echo "--- Showing /var/log/video-worker.log (latest 100 lines + follow) ---"
  echo "Press Ctrl+C to exit"
  echo ""
  tail -n 100 -f /var/log/video-worker.log
else
  echo "--- Worker log not created yet. Showing cloud-init-output.log ---"
  echo "Press Ctrl+C to exit"
  echo ""
  tail -n 100 -f /var/log/cloud-init-output.log
fi
