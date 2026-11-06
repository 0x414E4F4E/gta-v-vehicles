#!/usr/bin/env bash

# config
shopt -s globstar
shopt -s extglob
shopt -s nullglob

# prepare
mkdir -p temp

# function
extract_pack() {
    local SCOPE=$1
    local FILE=$2
    local PATTERN="${3:-"**/"}"
    local TARGET_DIR="raw/$SCOPE"
    rage extract "$FILE" "${PATTERN}vehicles.meta" -o temp
    rage extract "$FILE" "${PATTERN}carcols.*" -o temp
    rage extract "$FILE" "${PATTERN}carvariations.*" -o temp
    rage extract "$FILE" "${PATTERN}handling.meta" -o temp
    for f in temp/**
    do
        if [[ -f $f ]]; then
            mkdir -p "$TARGET_DIR"
            mv "$f" "$TARGET_DIR"
        fi
    done
    rm -rf temp/*
}

# x64b: basegame
extract_pack "basegame" "$GTA_ROOT/common.rpf"
extract_pack "basegame" "$GTA_ROOT/x64a.rpf"

# x64w: dlcs
mkdir -p x64w
rage extract "$GTA_ROOT/x64w.rpf" "*" -o x64w
for f in x64w/**/*.rpf
do
    DLC_NAME=$(basename "${f%/dlc.rpf}")
    extract_pack "$DLC_NAME" "$f"
done
rm -rf x64w

# update: patch
extract_pack "update" "$GTA_ROOT/update/update.rpf" "common/**/"
extract_pack "update" "$GTA_ROOT/update/update.rpf" "x64/**/"

# update: dlc patch
rage extract "$GTA_ROOT/update/update.rpf" "dlc_patch/**/vehicles.meta" -o temp &>/dev/null
rage extract "$GTA_ROOT/update/update.rpf" "dlc_patch/**/carcols.*" -o temp &>/dev/null
rage extract "$GTA_ROOT/update/update.rpf" "dlc_patch/**/carvariations.*" -o temp &>/dev/null
rage extract "$GTA_ROOT/update/update.rpf" "dlc_patch/**/handling.meta" -o temp &>/dev/null
for f in temp/**
do
    if [[ -f $f ]]; then
        DLC_NAME="$(echo "$f" | cut -d'/' -f3)_update"
        TARGET_DIR="raw/$DLC_NAME"
        mkdir -p "$TARGET_DIR"
        mv "$f" "$TARGET_DIR"
        echo "Extracting $DLC_NAME"
    fi
done
rm -rf temp/*

# new dlcs
for f in "$GTA_ROOT/update/x64/dlcpacks/"**/*.rpf
do
    DLC_NAME=$(basename "${f%/*.rpf}")
    extract_pack "$DLC_NAME" "$f"
done

# clean up
rm -rf temp
