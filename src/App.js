import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadWeb3, loadBlockchainData } from "./blockchain";
import {
	AppBar,
	Toolbar,
	Typography,
	Container,
	Card,
	CardContent,
	Button,
	Grid,
	TextField,
} from "@mui/material";
import Web3 from "web3";

function App() {
	const [account, setAccount] = useState("");
	const [votingContract, setVotingContract] = useState(null);
	const [monetizationContract, setMonetizationContract] = useState(null);
	const [voted, setVoted] = useState(false);
	const [premium, setPremium] = useState(false);
	const [pollTitle, setPollTitle] = useState("");
	const [candidateName, setCandidateName] = useState("");
	const [polls, setPolls] = useState([]);
	const [web3, setWeb3] = useState(null);

	useEffect(() => {
		const initBlockchain = async () => {
			try {
				const web3Instance = await loadWeb3();
				setWeb3(web3Instance);

				const { accounts, votingContract, monetizationContract } =
					await loadBlockchainData(web3Instance);

				setAccount(accounts[0]);
				setVotingContract(votingContract);
				setMonetizationContract(monetizationContract);

				const isPremium = await votingContract.methods
					.premiumUsers(accounts[0])
					.call();
				setPremium(isPremium);

				// Load existing polls and their candidates
				const pollCount = await votingContract.methods.pollCount().call();
				const pollArray = [];
				for (let i = 1; i <= pollCount; i++) {
					const poll = await votingContract.methods.polls(i).call();

					// Load candidates for each poll
					const candidateArray = [];
					for (let j = 1; j <= poll.candidatesCount; j++) {
						const candidate = await votingContract.methods
							.getCandidate(i, j)
							.call();
						candidateArray.push(candidate);
					}
					poll.candidates = candidateArray;
					pollArray.push(poll);
				}
				setPolls(pollArray);
			} catch (error) {
				console.error("Initialization error:", error);
				toast.error("Failed to load blockchain data.");
			}
		};

		initBlockchain();
	}, []);

	const createPoll = async () => {
		try {
			await votingContract.methods
				.addPoll(pollTitle)
				.send({ from: account, value: Web3.utils.toWei("0.01", "ether") });
			toast.success("Poll created successfully!");

			// Reload polls
			const pollCount = await votingContract.methods.pollCount().call();
			const pollArray = [];
			for (let i = 1; i <= pollCount; i++) {
				const poll = await votingContract.methods.polls(i).call();
				const candidateArray = [];
				for (let j = 1; j <= poll.candidatesCount; j++) {
					const candidate = await votingContract.methods
						.getCandidate(i, j)
						.call();
					candidateArray.push(candidate);
				}
				poll.candidates = candidateArray;
				pollArray.push(poll);
			}
			setPolls(pollArray);
		} catch (error) {
			console.error("Create poll error:", error);
			toast.error("Error creating poll!");
		}
	};

	const addCandidate = async (pollId) => {
		try {
			await votingContract.methods
				.addCandidate(pollId, candidateName)
				.send({ from: account });
			toast.success("Candidate added successfully!");

			// Reload candidates for the poll
			const updatedPolls = [...polls];
			const pollIndex = updatedPolls.findIndex((poll) => poll.id === pollId);
			const candidateArray = [];
			for (let j = 1; j <= updatedPolls[pollIndex].candidatesCount; j++) {
				const candidate = await votingContract.methods
					.getCandidate(pollId, j)
					.call();
				candidateArray.push(candidate);
			}
			updatedPolls[pollIndex].candidates = candidateArray;
			setPolls(updatedPolls);
		} catch (error) {
			console.error("Add candidate error:", error);
			toast.error("Error adding candidate!");
		}
	};

	const vote = async (pollId, candidateId) => {
		try {
			await votingContract.methods
				.vote(pollId, candidateId)
				.send({ from: account });
			setVoted(true);
			toast.success("Voted successfully!");

			// Reload votes for the poll
			const updatedPolls = [...polls];
			const pollIndex = updatedPolls.findIndex((poll) => poll.id === pollId);
			const candidateArray = [];
			for (let j = 1; j <= updatedPolls[pollIndex].candidatesCount; j++) {
				const candidate = await votingContract.methods
					.getCandidate(pollId, j)
					.call();
				candidateArray.push(candidate);
			}
			updatedPolls[pollIndex].candidates = candidateArray;
			setPolls(updatedPolls);
		} catch (error) {
			console.error("Vote error:", error);
			toast.error("Error voting!");
		}
	};

	const subscribe = async () => {
		try {
			await monetizationContract.methods
				.subscribe()
				.send({ from: account, value: Web3.utils.toWei("0.1", "ether") });
			setPremium(true);
			toast.success("Subscribed to premium successfully!");
		} catch (error) {
			console.error("Subscribe error:", error);
			toast.error("Error subscribing to premium!");
		}
	};

	const donate = async (amount) => {
		try {
			await monetizationContract.methods
				.donate()
				.send({ from: account, value: Web3.utils.toWei(amount, "ether") });
			toast.success("Donation successful!");
		} catch (error) {
			console.error("Donate error:", error);
			toast.error("Error making donation!");
		}
	};

	// Function to prompt user to connect wallet if not already connected
	const connectWallet = async () => {
		try {
			if (window.ethereum) {
				const web3Instance = new Web3(window.ethereum);
				await window.ethereum.request({ method: "eth_requestAccounts" });
				setWeb3(web3Instance);
				const accounts = await web3Instance.eth.getAccounts();
				setAccount(accounts[0]);
				const { votingContract, monetizationContract } =
					await loadBlockchainData(web3Instance);
				setVotingContract(votingContract);
				setMonetizationContract(monetizationContract);
			} else {
				toast.error("Please install MetaMask!");
			}
		} catch (error) {
			console.error("Error connecting wallet:", error);
			toast.error("Error connecting wallet!");
		}
	};

	return (
		<div>
			<ToastContainer />
			<AppBar position="static">
				<Toolbar>
					<Typography variant="h6">Decentralized Voting App</Typography>
				</Toolbar>
			</AppBar>
			<Container>
				{!account && (
					<Button
						variant="contained"
						color="primary"
						onClick={connectWallet}
						style={{ marginTop: "20px" }}
					>
						Connect Wallet
					</Button>
				)}
				{account && (
					<>
						<Typography variant="h5" style={{ marginTop: "20px" }}>
							Account: {account}
						</Typography>
						<Grid container spacing={3} style={{ marginTop: "20px" }}>
							{polls.map((poll) => (
								<Grid item xs={12} sm={6} md={4} key={poll.id}>
									<Card>
										<CardContent>
											<Typography variant="h6">{poll.title}</Typography>
											{poll.candidates.map((candidate) => (
												<div key={candidate.id}>
													<Typography variant="body2">
														{candidate.name} - {candidate.voteCount} votes
													</Typography>
													{!voted && (
														<Button
															variant="contained"
															color="primary"
															onClick={() => vote(poll.id, candidate.id)}
														>
															Vote
														</Button>
													)}
												</div>
											))}
											<TextField
												label="Candidate Name"
												value={candidateName}
												onChange={(e) => setCandidateName(e.target.value)}
												fullWidth
												style={{ marginTop: "10px" }}
											/>
											<Button
												variant="contained"
												color="primary"
												onClick={() => addCandidate(poll.id)}
												style={{ marginTop: "10px" }}
											>
												Add Candidate
											</Button>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
						<TextField
							label="Poll Title"
							value={pollTitle}
							onChange={(e) => setPollTitle(e.target.value)}
							fullWidth
							style={{ marginTop: "20px" }}
						/>
						<Button
							variant="contained"
							color="primary"
							onClick={createPoll}
							style={{ marginTop: "10px" }}
						>
							Create Poll
						</Button>
						{!premium && (
							<Button
								variant="contained"
								color="secondary"
								onClick={subscribe}
								style={{ marginTop: "20px" }}
							>
								Subscribe to Premium
							</Button>
						)}
						<Button
							variant="contained"
							color="secondary"
							onClick={() => donate("0.05")}
							style={{ marginTop: "20px" }}
						>
							Donate 0.05 ETH
						</Button>
					</>
				)}
			</Container>
		</div>
	);
}

export default App;
