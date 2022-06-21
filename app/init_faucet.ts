import * as spl from '@solana/spl-token';
import { Keypair } from "@solana/web3.js";
import * as fs from 'fs';
import * as anchor from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

async function initialize() {
  var kpJson = JSON.parse(fs.readFileSync("/home/limitlessdev/.config/solana/id.json").toString());
  var kp = Keypair.fromSecretKey(new Uint8Array(kpJson));
  let walletWrapper = new anchor.Wallet(kp)
  let program_id = new anchor.web3.PublicKey("3jNRmXFcRMhgubd5mec267q8AwxSMhxLHumzrp1QNnpT");
  const solConnection = new anchor.web3.Connection("https://api.devnet.solana.com");
  const provider = new anchor.AnchorProvider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(program_id, provider);
  const program = new anchor.Program(idl, program_id, provider);
  let ID = "NIRV";
  console.log("Creator key", walletWrapper.publicKey.toBase58())
  let [tokenFaucetAddress, tokenFaucetBump] = await anchor.web3.PublicKey.findProgramAddress(
    [provider.wallet.publicKey.toBuffer(), Buffer.from(ID)],
    program.programId
  );

  let [tokenFaucetMintAddress, tokenFaucetMintBump] = await anchor.web3.PublicKey.findProgramAddress(
    [tokenFaucetAddress.toBuffer(), Buffer.from("faucet_mint")],
    program.programId
  );
  const tx = await program.methods
    .initializeTokenFaucet(ID, 6, new anchor.BN(10_000_000))
    .accounts({
      creator: provider.wallet.publicKey,
      tokenFaucet: tokenFaucetAddress,
      tokenMint: tokenFaucetMintAddress,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    //.rpc({ skipPreflight: true, commitment: "confirmed" });
    .rpc();
  let faucet = await program.account.tokenFaucet.fetch(tokenFaucetAddress);
  console.log("Faucet created", faucet)

}
initialize()