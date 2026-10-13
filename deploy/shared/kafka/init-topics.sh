#!/bin/sh
set -eu
for topic in notification-topic user-profile-events user-direct-message-settings-events calendar-reminder-events project-task-events; do
  /opt/kafka/bin/kafka-topics.sh --create --if-not-exists --topic "$topic" \
    --bootstrap-server kafka:29092 --partitions 1 --replication-factor 1
done
