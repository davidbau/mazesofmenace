#!/usr/bin/env bash
set -euo pipefail

# Merge driver that keeps whichever side has the larger version counter.
# Usage (from git): git-merge-keepnewest.sh %O %A %B
#   %A is the output path and must contain the resolved result.

base_file="${1:-}"
ours_file="${2:-}"
theirs_file="${3:-}"

extract_counter() {
    local file="$1"
    local val=""
    if [[ ! -f "$file" ]]; then
        echo "-1"
        return
    fi

    val="$(sed -nE 's/^[[:space:]]*commit_number:[[:space:]]*([0-9]+)[[:space:]]*$/\1/p' "$file" | tail -n1)"
    if [[ -z "$val" ]]; then
        val="$(sed -nE 's/^[[:space:]]*export const COMMIT_NUMBER = ([0-9]+);[[:space:]]*$/\1/p' "$file" | tail -n1)"
    fi
    if [[ -z "$val" ]]; then
        val="$(grep -Eo '[0-9]+' "$file" | tail -n1 || true)"
    fi
    echo "${val:--1}"
}

ours_n="$(extract_counter "$ours_file")"
theirs_n="$(extract_counter "$theirs_file")"

if (( theirs_n > ours_n )); then
    cp "$theirs_file" "$ours_file"
elif (( ours_n < 0 && theirs_n < 0 )) && [[ -n "$base_file" && -f "$base_file" ]]; then
    cp "$base_file" "$ours_file"
fi

exit 0
