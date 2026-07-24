#!/bin/bash
pnpm install
pnpm build
cd apps/web
pnpm preview