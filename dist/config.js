"use strict";
/*
  =========================
  Blind Star - codename (developent)
  config.ts @ {server}
  =========================
  @date_inital 12 September 2018
  @date_modified 24 September 2018
  @author Henry Harder

  Constants and configuration.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = "0.0.1a5"; // PC Version 
// public/private ports for ABCI and RPC server
exports.ABCI_PORT = 26658;
exports.API_PORT = 3000;
// endpoints for ABCI/RPC
exports.ABCI_URI = "http://localhost:26657";
// encoding types for order transport 
exports.IN_ENC = 'utf8';
exports.OUT_ENC = 'base64';
