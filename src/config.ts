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

export const VERSION: string = "0.0.1a7"; // PC Version 

// public/private ports for ABCI and RPC server
export const ABCI_PORT: number = 26658;
export const API_PORT: number = 3000;

// endpoints for ABCI/RPC
export const ABCI_URI: string = "http://localhost:26657"

// encoding types for order transport 
export const IN_ENC: string = 'utf8'
export const OUT_ENC: string = 'base64'