/*
  =========================
  Blind Star - codename (developent)
  config.ts @ {master}
  =========================
  @date_inital 12 September 2018
  @date_modified 24 September 2018
  @author Henry Harder

  Constants and configuration.
*/
export const VERSION: string = "0.0.1a8"; // PC Version 

// endpoints for ABCI/RPC
export const ABCI_HOST: string = "localhost";
export const ABCI_RPC_PORT: number = 26657;

// public/private ports for ABCI, RPC, and WS servers
export const ABCI_PORT: number = 26658;
export const API_PORT: number = 3000;
export const WS_PORT: number = 8080;

// encoding types for order server-side transport 
export const IN_ENC: string = 'utf8'
export const OUT_ENC: string = 'base64'