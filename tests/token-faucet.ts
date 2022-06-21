import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenFaucet } from "../target/types/token_faucet";
import * as crypto from 'crypto';
import * as spl from '@solana/spl-token'
import { assert } from "chai";
describe("token-faucet", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const program = anchor.workspace.TokenFaucet as Program<TokenFaucet>;
  const ID = crypto.randomBytes(20).toString('hex').slice(0, 6);

  it("Is token faucet initialized!", async () => {

    let [tokenFaucetAddress, tokenFaucetBump] = await anchor.web3.PublicKey.findProgramAddress(
      [provider.wallet.publicKey.toBuffer(), Buffer.from(ID)],
      program.programId
    );

    let [tokenFaucetMintAddress, tokenFaucetMintBump] = await anchor.web3.PublicKey.findProgramAddress(
      [tokenFaucetAddress.toBuffer(), Buffer.from("faucet_mint")],
      program.programId
    );

    const tx = await program.methods
      .initializeTokenFaucet(ID, 6, new anchor.BN(1_000_000))
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
  });

  it("Is token sip succesful?", async () => {
    let [tokenFaucetAddress, tokenFaucetBump] = await anchor.web3.PublicKey.findProgramAddress(
      [provider.wallet.publicKey.toBuffer(), Buffer.from(ID)],
      program.programId
    );

    let [tokenFaucetMintAddress, tokenFaucetMintBump] = await anchor.web3.PublicKey.findProgramAddress(
      [tokenFaucetAddress.toBuffer(), Buffer.from("faucet_mint")],
      program.programId
    );
    //create associated account
    let associatedAddress = await spl.getAssociatedTokenAddress(tokenFaucetMintAddress, provider.wallet.publicKey);
    let tokenIns = await spl.createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      associatedAddress,
      provider.wallet.publicKey,
      tokenFaucetMintAddress
    )
    const tx = await program.methods.tokenSip(ID)
      .accounts({
        user: provider.wallet.publicKey,
        creator: provider.wallet.publicKey,
        tokenFaucet: tokenFaucetAddress,
        tokenMint: tokenFaucetMintAddress,
        userTokenAccount: associatedAddress,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
      }).preInstructions([tokenIns]).rpc();
      let user_token_account = await spl.getAccount(
        provider.connection,
        associatedAddress
      )
      assert.ok(Number(user_token_account.amount) == 1_000_000)

  });
});
