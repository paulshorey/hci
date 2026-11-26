#!/usr/bin/env bash
set -euo pipefail
umask 077
test "$(aws sts get-caller-identity --query Account --output text)" = "$OWNER"
archive="$RUNNER_TEMP/archive.tar.age"
capture_date=$(cat "$RUNNER_TEMP/capture-date")
[[ $capture_date =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
month=${capture_date%-*}
key="hci/production/$capture_date/$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.tar.age"
# The receipt is written only after byte comparison and retention verification succeed.
receipt="hci/production/monthly/$month.json"
bucket_args=(--bucket "$BUCKET" --expected-bucket-owner "$OWNER")
listing=$(aws s3api list-objects-v2 "${bucket_args[@]}" --prefix "$receipt")
has_receipt=$(jq -r --arg key "$receipt" 'any(.Contents[]?; .Key == $key)' <<<"$listing")
days=30
if [[ $has_receipt == false ]]; then days=366; fi
until_date=$(date -u -d "+$days days" +%FT%TZ)
target=("${bucket_args[@]}" --key "$key")
lock=$(aws s3api get-object-lock-configuration "${bucket_args[@]}")
jq -e '.ObjectLockConfiguration.ObjectLockEnabled == "Enabled" and (.ObjectLockConfiguration.Rule.DefaultRetention.Mode | IN("COMPLIANCE","GOVERNANCE"))' <<<"$lock" > /dev/null
aws s3 cp "$archive" "s3://$BUCKET/$key" --only-show-errors --checksum-algorithm SHA256
object=$(aws s3api head-object "${target[@]}")
version=$(jq -er '.VersionId | select(. != "null")' <<<"$object")
mode=$(jq -er '.ObjectLockMode | select(IN("GOVERNANCE","COMPLIANCE"))' <<<"$object")
current_until=$(jq -er '.ObjectLockRetainUntilDate' <<<"$object")
current_epoch=$(date -d "$current_until" +%s)
required_epoch=$(date -d "$until_date" +%s)
if (( current_epoch < required_epoch )); then
  aws s3api put-object-retention "${target[@]}" --version-id "$version" --retention "Mode=$mode,RetainUntilDate=$until_date"
fi
verify_retention() {
  local retained actual actual_epoch minimum_epoch
  retained=$(aws s3api head-object "${bucket_args[@]}" --key "$1" --version-id "$2")
  jq -e '.ObjectLockMode | IN("GOVERNANCE","COMPLIANCE")' <<<"$retained" > /dev/null
  actual=$(jq -er '.ObjectLockRetainUntilDate' <<<"$retained")
  actual_epoch=$(date -d "$actual" +%s)
  minimum_epoch=$(date -d "$3" +%s)
  test "$actual_epoch" -ge "$minimum_epoch"
}
verify_retention "$key" "$version" "$until_date"
aws s3api get-object "${target[@]}" --version-id "$version" "$RUNNER_TEMP/readback.age" > /dev/null
cmp "$archive" "$RUNNER_TEMP/readback.age"
receipt_file="$RUNNER_TEMP/monthly-receipt.json"
if [[ $has_receipt == false ]]; then
  jq -n --arg key "$key" --arg version "$version" --arg until "$until_date" \
    '{key: $key, version: $version, retainUntil: $until}' > "$receipt_file"
  aws s3api put-object "${bucket_args[@]}" --key "$receipt" --body "$receipt_file" \
    --if-none-match '*' --checksum-algorithm SHA256 > /dev/null
fi
aws s3api get-object "${bucket_args[@]}" --key "$receipt" "$receipt_file" > /dev/null
monthly_key=$(jq -er --arg prefix "hci/production/$month-" '.key | select(startswith($prefix))' "$receipt_file")
monthly_version=$(jq -er '.version | select(type == "string" and length > 0)' "$receipt_file")
monthly_until=$(jq -er '.retainUntil' "$receipt_file")
verify_retention "$monthly_key" "$monthly_version" "$monthly_until"
