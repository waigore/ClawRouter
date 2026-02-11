#!/usr/bin/env node

/**
 * ClawRouter Standalone Startup Script
 *
 * Starts the ClawRouter proxy without OpenClaw integration.
 * Useful for running as a standalone OpenAI-compatible proxy server.
 *
 * Usage:
 *   node scripts/start-standalone.js
 *
 * Environment variables:
 *   BLOCKRUN_PROXY_PORT  - Port to listen on (default: 8402)
 *   BLOCKRUN_WALLET_KEY  - Wallet private key (or reads from ~/.openclaw/blockrun/wallet.key)
 */

import { startProxy } from "../dist/proxy.js";
import { resolveOrGenerateWalletKey } from "../dist/auth.js";
import { BalanceMonitor } from "../dist/balance.js";

const DEFAULT_PORT = 8402;

/**
 * Format a timestamp for log output.
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Main entry point.
 */
async function main() {
  const port = parseInt(process.env.BLOCKRUN_PROXY_PORT || "", 10) || DEFAULT_PORT;

  console.log(`[${timestamp()}] ClawRouter standalone starting...`);

  // Resolve wallet key: saved file → env var → auto-generate
  let walletInfo;
  try {
    walletInfo = await resolveOrGenerateWalletKey();
  } catch (err) {
    console.error(`[${timestamp()}] Failed to resolve wallet key: ${err.message}`);
    process.exit(1);
  }

  const { key: walletKey, address, source } = walletInfo;

  switch (source) {
    case "generated":
      console.log(`[${timestamp()}] Generated new wallet: ${address}`);
      console.log(`[${timestamp()}] Saved to: ~/.openclaw/blockrun/wallet.key`);
      console.log(`[${timestamp()}] Fund with USDC on Base to start using ClawRouter.`);
      break;
    case "saved":
      console.log(`[${timestamp()}] Using saved wallet: ${address}`);
      break;
    case "env":
      console.log(`[${timestamp()}] Using wallet from BLOCKRUN_WALLET_KEY: ${address}`);
      break;
  }

  // Check wallet balance on startup
  const balanceMonitor = new BalanceMonitor(address);
  try {
    const balance = await balanceMonitor.checkBalance();
    if (balance.isEmpty) {
      console.warn(`[${timestamp()}] WARNING: No USDC balance. Fund wallet: ${address}`);
    } else if (balance.isLow) {
      console.warn(
        `[${timestamp()}] WARNING: Low balance: ${balance.balanceUSD}. Fund wallet: ${address}`,
      );
    } else {
      console.log(`[${timestamp()}] Wallet balance: ${balance.balanceUSD}`);
    }
  } catch (err) {
    console.warn(`[${timestamp()}] Could not check balance: ${err.message}`);
  }

  // Start the proxy
  let proxy;
  try {
    proxy = await startProxy({
      walletKey,
      port,
      onReady: (listenPort) => {
        console.log(`[${timestamp()}] ClawRouter proxy listening on http://localhost:${listenPort}/v1`);
        console.log(`[${timestamp()}] Health check: http://localhost:${listenPort}/health`);
        console.log(`[${timestamp()}] Wallet: ${address}`);
        console.log(`[${timestamp()}] Press Ctrl+C to stop`);
      },
      onError: (error) => {
        console.error(`[${timestamp()}] Proxy error: ${error.message}`);
      },
      onRouted: (decision) => {
        const cost = decision.costEstimate.toFixed(4);
        const saved = (decision.savings * 100).toFixed(0);
        console.log(
          `[${timestamp()}] [${decision.tier}] ${decision.model} $${cost} (saved ${saved}%) | ${decision.reasoning}`,
        );
      },
      onLowBalance: (info) => {
        console.warn(
          `[${timestamp()}] WARNING: Low balance: ${info.balanceUSD}. Fund wallet: ${info.walletAddress}`,
        );
      },
      onInsufficientFunds: (info) => {
        console.error(
          `[${timestamp()}] ERROR: Insufficient funds. Balance: ${info.balanceUSD}, Needed: ${info.requiredUSD}. Fund wallet: ${info.walletAddress}`,
        );
      },
    });
  } catch (err) {
    console.error(`[${timestamp()}] Failed to start proxy: ${err.message}`);
    process.exit(1);
  }

  // Graceful shutdown handler
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[${timestamp()}] Received ${signal}, shutting down gracefully...`);

    try {
      await proxy.close();
      console.log(`[${timestamp()}] Proxy stopped.`);
    } catch (err) {
      console.error(`[${timestamp()}] Error during shutdown: ${err.message}`);
    }

    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
