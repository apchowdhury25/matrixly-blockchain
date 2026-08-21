/** Minimal Gateway Contract surface used by FabricLedgerAdapter. */
export type CommitStatus = {
  successful: boolean;
  transactionId: string;
  blockNumber: bigint;
  code: number;
};

export type GatewayContract = {
  submitAsync(
    name: string,
    options?: { arguments?: string[] },
  ): Promise<{ getStatus(): Promise<CommitStatus> }>;
  evaluateTransaction(name: string, ...args: string[]): Promise<Uint8Array>;
};

export const FABRIC_PREVIOUS_UNAVAILABLE = "fabric:unavailable";

export function fabricEnv(): {
  endpoint?: string;
  mspId?: string;
  channel?: string;
  chaincode?: string;
  tlsRoot?: string;
  clientCert?: string;
  clientKey?: string;
} {
  const env = typeof process === "undefined" ? {} : process.env;
  return {
    endpoint: env.FABRIC_PEER_ENDPOINT?.trim(),
    mspId: env.FABRIC_MSP_ID?.trim(),
    channel: env.FABRIC_CHANNEL?.trim(),
    chaincode: env.FABRIC_CHAINCODE?.trim() || "document-registry",
    tlsRoot: env.FABRIC_TLS_ROOT_CERT?.trim(),
    clientCert: env.FABRIC_CLIENT_CERT?.trim(),
    clientKey: env.FABRIC_CLIENT_KEY?.trim(),
  };
}

export function ledgerAdapterName(): "hashchain" | "fabric" {
  const raw = (typeof process !== "undefined" ? process.env.LEDGER_ADAPTER : undefined)?.trim().toLowerCase();
  return raw === "fabric" ? "fabric" : "hashchain";
}

export function fabricConfigured(): boolean {
  const e = fabricEnv();
  return Boolean(e.endpoint && e.mspId && e.channel && e.tlsRoot && e.clientCert && e.clientKey);
}
