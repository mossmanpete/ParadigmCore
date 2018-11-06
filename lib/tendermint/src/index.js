let url = require('url')
let debug = require('debug')('tendermint-node')
let _exec = require('execa')
let _spawn = require('cross-spawn')
let { RpcClient } = require('tendermint')
let flags = require('./flags.js')

const logging = process.env.TM_LOG
const binPath = process.env.TM_BINARY ||
  require.resolve('../bin/tendermint')

function exec(command, opts, sync) {
  let args = [command, ...flags(opts)]
  debug('executing: tendermint ' + args.join(' '))
  let res = (sync ? _exec.sync : _exec)(binPath, args)
  maybeError(res)
  return res
}

function spawn(command, opts) {
  let args = [command, ...flags(opts)]
  debug('spawning: tendermint ' + args.join(' '))
  let child = _spawn(binPath, args)

  setTimeout(() => {
    try {
      child.stdout.resume()
      child.stderr.resume()
    } catch (err) { }
  }, 4000)

  if (logging) {
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
  }

  let promise = new Promise((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  child.then = promise.then.bind(promise)
  child.catch = promise.catch.bind(promise)
  return child
}

function maybeError(res) {
  if (res.killed) return
  if (res.then != null) {
    return res.then(maybeError)
  }
  if (res.code !== 0) {
    throw Error(`tendermint exited with code ${res.code}`)
  }
}

function node(path, opts = {}, protocol) {
  if (typeof path !== 'string') {
    throw Error('"path" argument is required')
  }

  opts.home = path
  let child = spawn('node', opts)
  let rpcPort = getRpcPort(opts)
  return setupChildProcess(child, rpcPort, protocol)
}

function setupChildProcess(child, rpcPort) {
  let rpc = RpcClient(`http://localhost:${rpcPort}`)
  let started, synced

  return Object.assign(child, {
    rpc,
    started: () => {
      if (started) return started
      started = waitForRpc(rpc, child)
      return started
    },
    synced: () => {
      if (synced) return synced
      synced = waitForSync(rpc, child)
      return synced
    }
  })
}

function getRpcPort(opts, defaultPort = 26657) {
  if (!opts || ((!opts.rpc || !opts.rpc.laddr) && !opts.laddr)) {
    return defaultPort
  }
  let parsed = url.parse(opts.laddr || opts.rpc.laddr)
  return parsed.port
}

let waitForRpc = wait(async (client) => {
  await client.status()
  return true
})

let waitForSync = wait(async (client) => {
  let status = await client.status()
  return (
    status.sync_info.catching_up === false &&
    Number(status.sync_info.latest_block_height) > 0
  )
})

// modified function
function wait(condition) {
  return async function (client, child) {
    while (true) {
      try {
        if (await condition(client)) break
      } catch (err) {}

      await sleep(100)
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  node,
  init: (home) => exec('init', { home }),
  initSync: (home) => exec('init', { home }, true),
  version: () => exec('version', {}, true).stdout,
  genValidator: () => exec('gen_validator', {}, true).stdout
}
