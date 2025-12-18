// Loaded from config.js
const CONTRACT_ADDRESS = CONFIG.CONTRACT_ADDRESS;
const NETWORK_ID = CONFIG.NETWORK_ID;

let ABI = [];

// State
let provider, signer, contract;
let userAddress = null;

// UI Refs
const els = {
    connectBtn: document.getElementById('connectBtn'),
    accountDisplay: document.getElementById('accountDisplay'),
    userAddress: document.getElementById('userAddress'),
    userBalance: document.getElementById('userBalance'),
    contractBalance: document.getElementById('contractBalance'),
    depositInput: document.getElementById('depositAmount'),
    withdrawInput: document.getElementById('withdrawAmount'),
    ownerZone: document.getElementById('ownerZone'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    logList: document.getElementById('activityLog')
};

async function loadABI() {
    try {
        // We expect the correct relative path from http-server root
        const response = await fetch('./artifacts/contracts/wallet.sol/Karnawallet.json');
        if (!response.ok) throw new Error("ABI Invalid");
        const data = await response.json();
        ABI = data.abi;
    } catch (e) {
        console.error("ABI Load Error", e);
        showToast("Error: Could not load Contract ABI. Check console.", "error");
    }
}

async function init() {
    await loadABI();
    
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);

        // 1. Check if already trusted/connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            handleAccountChanged(accounts[0]);
        }

        // 2. Setup Listeners (CRITICAL FOR ACCOUNT SEPARATION)
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                // User disconnected everything
                resetState();
            } else {
                // User switched account in Metamask
                handleAccountChanged(accounts[0]);
            }
        });

        window.ethereum.on('chainChanged', () => {
             window.location.reload(); // Best practice: reload on network change
        });

    }
}

async function connectWallet() {
    if (!window.ethereum) return showToast("Metamask not found!");
    try {
        const accounts = await provider.send("eth_requestAccounts", []);
        handleAccountChanged(accounts[0]);
    } catch (err) {
        console.error(err);
        showToast("Connection failed or rejected");
    }
}

// Ensure strict state reset when account changes
async function handleAccountChanged(newAddress) {
    // 1. Reset UI first
    els.ownerZone.classList.add('hidden');
    els.depositInput.value = '';
    els.withdrawInput.value = '';
    
    // 2. Set new user
    userAddress = newAddress;
    signer = provider.getSigner(); // Signer updates automatically with provider if account changed in Metamask? Actually we should get signer again.
    
    // 3. Update Connection UI
    els.connectBtn.classList.add('hidden');
    els.accountDisplay.classList.remove('hidden');
    els.userAddress.innerText = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    els.statusDot.classList.add('connected');
    els.statusText.innerText = "Connected";

    // 4. Re-instantiate Contract with new Signer
    if(ABI.length > 0) {
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        // 5. Fetch Data for THIS user
        refreshData();
        checkOwner();
        setupEvents(); // Re-bind events? Better to strictly bind events once or filter?
        // Ethers v5 handles filters well.
    }
    
    showToast(`Switched to ${userAddress.substring(0,6)}...`);
}

function resetState() {
    userAddress = null;
    contract = null;
    els.connectBtn.classList.remove('hidden');
    els.accountDisplay.classList.add('hidden');
    els.userBalance.innerText = "0.00";
    els.contractBalance.innerText = "0.00";
    els.ownerZone.classList.add('hidden');
    els.statusDot.classList.remove('connected');
    els.statusText.innerText = "Disconnected";
    showToast("Wallet Disconnected");
}

async function refreshData() {
    if (!contract || !userAddress) return;

    try {
        // User Balance (Unique to msg.sender)
        const rawBalance = await contract.balances(userAddress);
        els.userBalance.innerText = ethers.utils.formatEther(rawBalance);

        // Global Contract Balance
        const rawContractBal = await contract.contractBalance();
        els.contractBalance.innerText = ethers.utils.formatEther(rawContractBal);
    } catch (err) {
        console.warn("Fetch data error:", err);
    }
}

async function checkOwner() {
    if (!contract) return;
    try {
        const owner = await contract.owner();
        // Case-insensitive comparison is CRITICAL
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
            els.ownerZone.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Actions ---

async function depositRPC() {
    const val = els.depositInput.value;
    if (!val || val <= 0) return showToast("Enter valid ETH amount");
    
    try {
        const tx = await contract.deposit({ value: ethers.utils.parseEther(val) });
        showToast("Deposit Pending...");
        addLog("Deposit", `${val} ETH pending`);
        
        await tx.wait();
        
        showToast("Deposit Confirmed!");
        refreshData();
        els.depositInput.value = "";
    } catch(err) {
        console.error(err);
        showToast("Deposit Failed", "error");
    }
}

async function withdrawRPC() {
    const val = els.withdrawInput.value;
    if (!val || val <= 0) return showToast("Enter valid ETH amount");

    try {
        const tx = await contract.withdraw(ethers.utils.parseEther(val));
        showToast("Withdraw Pending...");
        addLog("Withdraw", `${val} ETH pending`);

        await tx.wait();

        showToast("Withdraw Confirmed!");
        refreshData();
        els.withdrawInput.value = "";
    } catch(err) {
        console.error(err);
        // Extract error reason if possible
        let msg = "Transaction Failed";
        if (err.data && err.data.message) msg = err.data.message;
        if (err.reason) msg = err.reason;
        
        showToast(msg, "error");
    }
}

async function ownerWithdrawRPC() {
    const val = document.getElementById('ownerAmount').value;
    if (!val) return;
    try {
        const tx = await contract.ownerWithdraw(ethers.utils.parseEther(val));
        await tx.wait();
        showToast("Owner Withdraw Success");
        refreshData();
    } catch (e) {
        showToast("Failed", "error");
    }
}

// --- Events ---
let eventsSetup = false;
function setupEvents() {
    if (eventsSetup) return; // Prevent double binding
    if (!contract) return;

    // We can listen to ALL events and filter in UI, or just update data
    // Simply refreshing data on any event is safer for consistency
    const refresh = () => { refreshData(); };
    
    contract.on("KarnaDeposit", (user, amount) => {
         if(user.toLowerCase() === userAddress.toLowerCase()) {
             showToast("Deposit Confirmed via Event");
             refresh();
         }
         addLog("Network", `Deposit detected from ${user.substring(0,4)}...`);
    });

    contract.on("KarnaWithdraw", (user, amount) => {
        if(user.toLowerCase() === userAddress.toLowerCase()) {
            showToast("Withdraw Confirmed via Event");
            refresh();
        }
        addLog("Network", `Withdraw detected from ${user.substring(0,4)}...`);
    });
    
    eventsSetup = true;
}

// --- Utils ---

function switchTab(tab) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tab}Tab`).classList.add('active');
}

function showToast(msg, type='info') {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.backgroundColor = type === 'error' ? '#ef4444' : 'white';
    t.style.color = type === 'error' ? 'white' : 'black';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function addLog(action, desc) {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerHTML = `<span>${action}</span> <span>${desc}</span>`;
    els.logList.prepend(li);
    
    // Remove empty state
    const empty = document.querySelector('.empty-state');
    if (empty) empty.remove();
}

els.connectBtn.addEventListener('click', connectWallet);
window.addEventListener('DOMContentLoaded', init);
