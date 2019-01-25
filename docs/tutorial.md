---
title: Full Node Tutorial
---

# Full OrderStream Node Tutorial

#### Follow this guide to set up a full OrderStream node, and connect it to the `blind-star` test-network.

Full (non-validating*) OrderStream nodes are an important part of the network, and are the primary way that organizations, individuals, and applications can access the network and the primary order event stream. Full nodes can join and leave the network at any time, only needing certain information (discussed here, and later in this tutorial) to join and reach consensus with the rest of the network.

For more information about the different types of nodes in a Tendermint network (including the OrderStream), take a look at the relevant [Tendermint documentation.](https://www.tendermint.com/docs)

If you have a validator key pair that is either a) included in the network's `genesis.json` file (and has not subsequently been removed) or b) has been added to the active validator set as a result of governance processes in the ValidatorRegistry contract, you can follow this tutorial to join the network as a validator. 

### What can full nodes do?
A full OrderStream node is identical to a validator in the following ways:

- Maintains full blockchain history
- Validates incoming order and stream transactions from validators
- Updates and stores the network state
- Tracks the Paradigm contracts on the Ethereum blockchain
- Allows access to the order event stream

Full nodes are different from validator nodes in the following ways:

- They do not possess an active validator private/public keypair 
- They cannot propose blocks or transactions
- They do not run a Witness sub-process (read more here)
- They cannot sign or submit incoming order or stream transactions
- They cannot vote on blocks or otherwise participate in consensus

### Why run a full node?
There are many reasons you may want to run a full OrderStream node. Doing so gives you direct, local access to the actual order event-stream, and allows you to gain access to other state and network information that is usually not accessible from remote nodes. Reasons may include:

- Deriving and order book from the OrderStream
- Accessing network state and block history
- Building a block/transaction explorer for the network
- Auditing validator behavior and liveness
- and more!

### Who can run a full node?
In short, anyone can run a full node. In reality, there is a technical barrier for some individuals to setup and run a full node. Generally you will need:

- Familiarity with Unix/Linux systems
- Familiarity with the command line
- Ability to solve dependency/firewall/configuration problems
- Understanding of general development processes
- Access to a dedicated or virtual Linux server (desktop computers should only be used for development)
- Understanding of the JavaScript/TypeScript ecosystem

Although the process of actually configuring and setting up ParadigmCore has been simplified as more automation is introduced, and the software has matured, for some it still may be considered an involved process. For those experienced and comfortable at the command-line, this process should take no longer than an hour. 

 *_the only difference between a full (non-validating) node, and a validator is weather or not the Tendermint keypair is included in the active validator set. Individuals/organizations with an active validator key pair can follow this guide for configuring their validator node.__ 

## Set up environment

If you intend to run a full node in production (or use it in an existing/new application stack), it is highly recommended to deploy it on a standalone server, either a VM or bare-metal. You can also install it on an existing server you have one provisioned. For development purposes, it is fine to setup and run ParadigmCore on your local desktop or laptop. 

This tutorial will cover installing ParadigmCore on a fresh Linux server, running **Ubuntu 18.04 LTS**, however the instructions should be similar for most linux environments. You will simply need to adjust the commands for your distribution/package manager. 

In addition to our multi-node testnet currently deployed on Ubuntu servers around the world, we have successfully run ParadigmCore on macOS laptops during development with no issues. ParadigmCore has not been tested or run on any Windows operating system yet, but feel free to try and let us know how it goes and what issues arise. 

### Hardware recommendations
As mentioned above, this tutorial will cover installing ParadigmCore on Ubuntu 18.04 LTS. It was written while using a VM provisioned on Linode, but you can use any cloud provider (or bare-metal instance) you wish. ParadigmCore will run on any Linux distribution, so long as it is configured properly. 

The hardware recommendations for validators and full nodes are the same, and are merely guidelines. Consider allocating more resources if you expect high traffic, or intend to run additional applications or services on the same instance. 

NOTE: The specifications below are for an OrderStream full/validator node that also runs a full Ethereum node (recommended). If you are using a remote JSONRPC/Web3 provider you will need less than the specs listed below. We suggest validators use the higher-end recommendations for each point.

- **OS**: macOS/Linux (Ubuntu 16+ suggested)
- **CPU**: 4-8 cores (virtual or physical)
- **RAM**: 8-16 GB
- **SSD**: 150-240 GB (SSD required for local Ethereum client)

Due to the high IO rates required by both Tendermint and the Ethereum client, the use of HDD's is highly discouraged for nodes with high expected uptime.

### Basic configuration
The steps in this section will cover the following:

- Updating server software
- Setting up limited user account
- Setting timezone and hostname

Feel free to skip this section if you already have a server provisioned, are using a different distribution than Ubuntu, or wish to use a custom setup.

If a command is shown with a `#`, it should be run with a root account (not sudo). If a `$` is shown, it should be run by a limited user account. If sudo is needed, that will be specified. 

#### a. Update software, set timezone and host
First, you will need to update all software, and do some basic configuration if this is a fresh server/environment.

##### Update packages
Note that sudo is not used here, since the assumption is no limited user has been set up yet. These commands are intended to be run as the root user. The command to use (if copy/pasting) will follow the `#` or `$.` 

```
# apt-get update && apt-get full-upgrade -y
```
##### Set hostname
Pick a hostname for your machine. Keep in mind if you want this node to be publicly accessible, the hostname will be part of the fully-qualified domain name (FQDN). Replace HOSTNAME with your chosen name.

```
# hostnamectl set-hostname HOSTNAME
```

If you are hosting this node publicly and pointing a domain to it, you will also need to update the file at `/etc/hosts`.

##### Set timezone
Use the following command to set the correct time zone for your machine (brings up a GUI).

```
# dpkg-reconfigure tzdata
```
#### b. Setup limited user account
Now you must setup a limited user account with sudo privileges. This is the user that will have ParadigmCore installed to its home directory, and will be used for the rest of the setup. Pick any name you like, we will use USERNAME as a placeholder. 

```
# adduser USERNAME
```

You will be prompted to set a password and some additional information. Then, add your new user to the sudo group. 

```
# adduser USERNAME sudo
```

Now, reboot the server and log in with your new credential. You will not use the root account again in this tutorial, instead you will use the sudo command any time root permissions are needed.

```
# reboot
```

## Set up firewall
In this section, you will setup a firewall and allow access to the required ports for a OrderStream full node.

Not mentioned in this section is configuring your server to use SSH keys as opposed to password login. This is highly recommended, and you can find instructions to do this for a variety of operating systems here. We also recommend disabling remote login to the root account. Instructions to do so can be found at the same link above.

We will be using `ufw` as the firewall in this tutorial, which stands for "uncomplicated firewall". It is very easy to set up. Keep in mind your desired configuration may differ from what is listed below.

First, enable `ufw` and set the defaults. 

```shell
$ sudo ufw default allow outgoing
$ sudo ufw default deny incoming
```

Now, allow access to the SSH port (so you can continue to login remotely).

```shell
$ sudo ufw allow ssh
```

If you are hosting web applications on this node, or with to proxy connections to ParadigmCore's API (discussed later), run the following.

```shell
$ sudo ufw allow http/tcp
$ sudo ufw allow https/tcp
```

Next, you must allow access to the port Tendermint uses to communicate with the rest of the network. 

```shell
$ sudo ufw allow 26656/tcp
```

Finally, enable ufw and restart the server again.

```shell
$ sudo ufw enable
$ sudo reboot
```

## Install software

There are several packages you must install before you can run ParadigmCore and connect it to the OrderStream network. This includes Node.js (the required runtime for ParadigmCore) as well as some required build tools, and an optional Ethereum client. 

### Install build tools
Certain ParadigmCore dependencies rely on common software build tools. Conveniently, they can all be installed with the following command(s). 

```shell
$ sudo apt-get update && sudo apt-get full-upgrade -y
$ sudo apt-get install -y build-essential
```

### Install `node` and `npm`
The current version of ParadigmCore is implemented in TypeScript, with **Node.js v10.4** (or greater) as the target runtime. Run the following commands to **install Node.js v11.x**, the currently recommended version. 

```shell
$ curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```

## Configure Ethereum client
Skip this step if you plan to use Infura or another remote `web3` provider. The instructions show below are for `parity`, but feel free to use `geth` or another Ethereum client of your choosing. 

### Download and install binary
Grab a recent Parity Ethereum binary with their convenient one-liner install script.

```shell
$ bash <(curl https://get.parity.io -L)
```

### Setup service
Perform the following steps to configure your node to run in the background, and automatically restart on failure or server reboot. 

First, create a `systemd` service file for parity.

```shell
$ sudo touch /etc/systemd/system/parity.service
```

Open the new file with your favorite text editor (`vim`, `nano`, `emacs`, etc.) and paste in the following.

```shell
[Unit]
Description=Parity Ethereum Daemon
After=network.target

[Service]
ExecStart=/usr/bin/parity --config /etc/parity/config.toml
Restart=on-failure
KillSignal=SIGHUP

[Install]
WantedBy=default.target
```

### Create configuration file
Now, you will create a `config.toml` file that will be used by the system to configure the parity process. Currently, the OrderStream network uses Ethereum's Ropsten testnet, so to sync with the current OrderStream network, your Ethereum client must sync to the Ropsten testnet.

```shell
$ sudo mkdir /etc/parity
$ sudo touch /etc/parity/config.toml
```

Open the newly created configuration file (with `sudo` privileges) and paste in the following. Adjust the config if you are deploying a custom OrderStream on a different Ethereum network.

```shell
[parity]
chain = "ropsten"

[network]
warp = false
```

### Enable and start parity
With the configuration files in place for `parity` and `systemd`, you can start the client and begin chain synchronization with the following commands. 

```shell
$ sudo systemctl enable parity
$ sudo systemctl start parity
```

Depending on your server's resources and network connection, syncing `parity` to the Ropsten testnet can take up to 12 hours. Feel free to proceed with this tutorial in the meantime.

## Configure ParadigmCore

ParadigmCore (PC) is the reference implementation of the OrderStream, and is currently the only network client. Although still in development, we consider PC to be mostly stable. The most recent ParadigmCore version is relatively easy to set up, thanks to a startup script that handles much of the once tedious configuration steps.

This section will guide you through the process of cloning and configuring ParadigmCore, after which you will be able to do one of the following.

- Run a single-node development "network"
- Join the existing OrderStream test-network
- Create your own private OrderStream network

### Clone ParadigmCore source

In the absence of a downloadable release for ParadigmCore, you must clone the source repository via `git`. 

First, create a new directory in your home folder - or wherever else you wish to store, build, and run ParadigmCore.

```shell
$ mkdir ~/paradigmcore
```

You can use `http` (first command) or `ssh` (second command) to clone the repository from GitHub, into the directory you just created. 

```shell
# clone via https
$ git clone https://github.com/ParadigmFoundation/ParadigmCore ~/paradigmcore

# clone via ssh
$ git clone git@github.com:ParadigmFoundation/ParadigmCore ~/paradigmcore
```

### Set environment variables
ParadigmCore is configured via local environment variables. You can store these config variables in a `.env` file (recommended) placed in the root directory of ParadigmCore. A startup script will handle the installation and configuration of tendermint, but first you must set the necessary config variables.

#### Copy included template
Get started by copying a mostly filled template included with the repository. You can use a blank template (also included) for more granular control and custom setups.

```shell
$ cd ~/paradigmcore
$ cp lib/template.env .env
```

Unless otherwise specified, you should run all commands in your ParadigmCore root directory for the rest of this lesson.

#### Add required fields 
There are three fields that must be added to the `.env` in for all configurations, and an additional one for nodes joining an existing network.

The most up-to-date testnet information can be found [here.](https://github.com/ParadigmFoundation/blind-star-testnet)

- `NODE_TYPE` is used to configure full vs. validator (required)
- `NODE_ENV` is for development/production (required)
- `WEB3_PROVIDER` specifies Ethereum connection (required)
- `SEEDS` is optional, but required for joining an existing network

A few possible configurations are discussed and listed below, choose the one that best suits your goal with ParadigmCore. 

**a) Full node on OrderStream test-network**

If you want to run a full node, and connect it to the existing OrderStream test-network, and have a local Ethereum client installed and synced, set the following fields.

```shell
NODE_TYPE="full"
NODE_ENV="production"
WEB3_PROVIDER="ws://localhost:8546"
SEEDS="AB96D9C6ACA18EE587A5DC24783CFBA20636D0E8@bs1.paradigm.market:26656"
```

If you want to run a full node on the existing test-network, but don't have or want a full Ethereum client locally, replace `WEB3_PROVIDER` with the following.

```shell
WEB3_PROVIDER="wss://ropsten.infura.io/ws"
```

**b) Single local development node**

Use this configuration if you wish to run a single instance of ParadigmCore locally for development or testing purposes. With this config, you will be the only node on your "network" and will act as a validator.

```shell
NODE_TYPE="validator"
NODE_ENV="development"
WEB3_PROVIDER="wss://ropsten.infura.io/ws"
```

If you use the rest of the configuration from the template, you will still connect to the Paradigm contract system deployed on the Ropsten test-network. Using a custom/private contract system will be discussed in a future tutorial.

**c) Validator node on OrderStream test-network**

Use this configuration if you already are included as a validator in the testnet's genesis.json file, or have communicated with the Paradigm team to join the testnet as a validator.

```shell
NODE_TYPE="validator"
NODE_ENV="production"
WEB3_PROVIDER="ws://localhost:8546"
SEEDS="AB96D9C6ACA18EE587A5DC24783CFBA20636D0E8@bs1.paradigm.market:26656"
```

A local Ethereum client is required for OrderStream validators. See previous lesson for parity install instructions. 

### Add genesis file

Validators and full nodes intending to join the active OrderStream test-network will also need to obtain the [current `genesis.json`](https://github.com/ParadigmFoundation/blind-star-testnet) that the OrderStream testnet was initialized with. You will need to place that file at `lib/tendermint/config/genesis.json` and delete the file generated after the next step.

## Install dependencies
After adding the required fields to your configuration file, you can run npm i to perform various configuration steps. It will handle the following primary steps, among other setup and validation.

- Install `npm` dependencies 
- Install and update `tendermint` binary
- Initialize and configure `tendermint`
- Install and configure JS tendermint driver
- Generate and store a Tendermint keypair 
- Validate environment file

If there is an issue with your environment file or other configuration, it will prompt you with helpful messages as to what went wrong, and how to remedy it in some cases. 

### Install global dependencies
A common issue people run into with ParadigmCore revolves around a Node.JS dependency that is used by multiple libraries that PC in turn depends on. This issue is sometimes preemptively avoided by installing `scrypt` and `node-gyp` globally before proceeding with the ParadigmCore setup.

```shell
$ npm install --global node-gyp
$ npm install --global scrypt
```

If you face issues with global permissions with `npm`, try following [this troubleshooting guide.](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### Run ParadigmCore setup
Trigger the steps mentioned above with the following command, run in your ParadigmCore root directory.

```shell
$ npm install
```

The final messages printed to the console should inform you that setup completed successfully, and you are ready to start ParadigmCore. If you do not see the message below, make sure you have followed all the steps in this tutorial correctly.

```
ParadigmCore setup completed!

Start your node with `yarn launch` or `npm run launch`.
```

If the output tells you to change something in your environment file, make that change and running npm i again.

## Build and run ParadigmCore

If you have reached this point, congratulations! You're ready to build ParadigmCore from source, and start your node. If you used the configuration to join the current OrderStream test-network, your node should immediately start replaying transactions from the genesis block, and eventually synchronize with the rest of the network. This process can take several hours. 

### Build source files

Since ParadigmCore is implemented in TypeScript, you will need to build the source files to executable JavaScript files. ParadigmCore ships with a `tsconfig.json` file which should require no modification. If you wish to fine-tune the output files for your environment, make modifications to the `tsconfig.json` file before running the next command. 

Run the following to build ParadigmCore source files to `./dist`.

```shell
$ npm run build
```

Upon successful compilation, you can start your node by running the following.

```shell
$ npm run start
```

## Troubleshooting

If you ran into issues following this tutorial, don't hesitate to ask for help in one of the following places.

- Open an issue in the [ParadigmCore repository](https://github.com/ParadigmFoundation/ParadigmCore)
- Ask the team on [our chat server](https://chat.paradigm.market)

If you encounter an issue you believe to be a bug or design flaw, please inform us as well.
