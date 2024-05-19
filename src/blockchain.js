import Web3 from "web3";
import detectEthereumProvider from "@metamask/detect-provider";
import Voting from "./contracts/Voting.json";
import Monetization from "./contracts/Monetization.json";

export async function loadWeb3() {
	try {
		const provider = await detectEthereumProvider();
		if (!provider) {
			throw new Error(
				"No Ethereum provider detected. Install MetaMask or another wallet."
			);
		}
		return new Web3(provider);
	} catch (err) {
		console.error(`Error loading Web3: ${err.message}`);
		throw err;
	}
}

export async function loadBlockchainData(web3) {
	try {
		const accounts = await web3.eth.requestAccounts();
		if (!accounts.length) {
			throw new Error("No accounts found. Make sure your wallet is unlocked.");
		}

		const networkId = await web3.eth.net.getId();

		const votingDeployedNetwork = Voting.networks[networkId];

		if (!votingDeployedNetwork) {
			throw new Error("Voting contract not deployed to the detected network.");
		}
		const votingContract = new web3.eth.Contract(
			Voting.abi,
			votingDeployedNetwork.address
		);

		const monetizationDeployedNetwork = Monetization.networks[networkId];
		if (!monetizationDeployedNetwork) {
			throw new Error(
				"Monetization contract not deployed to the detected network."
			);
		}
		const monetizationContract = new web3.eth.Contract(
			Monetization.abi,
			monetizationDeployedNetwork.address
		);

		return { accounts, votingContract, monetizationContract };
	} catch (err) {
		console.error(`Error loading blockchain data: ${err.message}`);
		throw err;
	}
}
