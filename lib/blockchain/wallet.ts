// lib/blockchain/wallet.ts
// A minimal implementation to ensure the file exists

import { ethers } from 'ethers';

export async function connectWallet() {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      return { provider, signer, address };
    }
    throw new Error('No Ethereum wallet found');
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

export async function getChainId() {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      return network.chainId;
    }
    return 1; // Default to Ethereum mainnet
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return 1;
  }
}

export async function isWalletConnected() {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    }
    return false;
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
}