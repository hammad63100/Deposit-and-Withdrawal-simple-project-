# Deposit and Withdraw DApp

A simple decentralized application for depositing and withdrawing Ether, built with Hardhat and Vanilla JavaScript.

## Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- [MetaMask](https://metamask.io/) extension installed in your browser.

## Project Structure

- `contracts/`: Solidity smart contracts.
- `frontend/`: The web user interface.
- `scripts/`: Deployment scripts.

## How to Run Locally

Follow these steps to set up and run the project:

### 1. Install Dependencies

Open a terminal in the project root and run:

```bash
npm install
```

### 2. Start Local Blockchain

Start a local Hardhat network. This will give you 20 test accounts with fake ETH.

```bash
npx hardhat node
```

> **Keep this terminal running.** This is your local blockchain server.

### 3. Deploy Smart Contract

Open a **new terminal** (the second one) and deploy the contract to your local network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This command will:
- Deploy the `Karnawallet` contract.
- Automatically update `frontend/config.js` with the new contract address.

### 4. Start the Frontend

In the same second terminal (or a new one), start the web server:

```bash
npx http-server ./frontend
```

Open the URL shown in the terminal (usually `http://127.0.0.1:8080`) in your browser.

## How to Use

1.  **Configure MetaMask**:
    - Open MetaMask and add a new network manually:
        - **Network Name**: Localhost 8545
        - **New RPC URL**: `http://127.0.0.1:8545`
        - **Chain ID**: `31337`
        - **Currency Symbol**: `ETH`
    - Import a test account:
        - Copy one of the "Private Keys" from the terminal where you ran `npx hardhat node`.
        - In MetaMask, click the account icon -> "Import Account" -> Paste the key.

2.  **Interact with the DApp**:
    - Go to the frontend URL (e.g., `http://127.0.0.1:8080`).
    - Connect your wallet.
    - Enter an amount to Deposit or Withdraw.