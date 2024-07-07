
import {
    Keypair,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    getMintLen,
    getMint,
    getOrCreateAssociatedTokenAccount,
    createInitializeTransferFeeConfigInstruction,
    mintTo,
    getTransferFeeAmount,
    transferCheckedWithFee,

  } from "@solana/spl-token";
  import { keypair, payer } from "./keypair.js";
  import { connection } from "./connection.js";
  
  
  // setting up the mint address
  const mint = Keypair.generate();
  const decimals = 2;
  const supply = 1000000;

   //calculating the amount of token to mint to the source wallet
   const smallUnit = 10 ** decimals
   const amountToMint = BigInt(100 * smallUnit);

  //calculating the fee basis point
  const maxFee = BigInt(5000);
  const tokensToSend = 10; 
  const transferAmount = tokensToSend * (10 ** decimals) //calculating the smaller unit of the tokkens to send.
const basisPointFee = transferAmount * (50 / 10_000) //fees on basis
const fee = (basisPointFee > maxFee) ? maxFee : basisPointFee; //logic to use when above maxfee
  
  //calculating the space needed for the metadata
  const mintAccTransferFee = getMintLen([ExtensionType.TransferFeeConfig])
  
  //rent required for mint account 
  const lamports = await connection.getMinimumBalanceForRentExemption(mintAccTransferFee);
  
  
  //Building the instructions below 
  
  const createAccount1 = SystemProgram.createAccount({
    // call System Program to create new account
    fromPubkey: payer,
    newAccountPubkey: mint.publicKey,
    space: mintAccTransferFee,
    programId: TOKEN_2022_PROGRAM_ID,
    lamports
  });

  const initializeTransferFeeConfig = createInitializeTransferFeeConfigInstruction(
    //initializing transfer fee
    mint.publicKey,
    payer,
    payer,
    50,
    maxFee,
    TOKEN_2022_PROGRAM_ID
  )
  
  
  const initializeMint = createInitializeMintInstruction(
    //initializing the mint Account
    mint.publicKey,
    decimals,
    payer,
    null,
    TOKEN_2022_PROGRAM_ID,
  );
  
  
  // Add instructions to new transaction
  const transaction = new Transaction().add(
    createAccount1,
    initializeTransferFeeConfig,
    initializeMint,
  );
  
  // Send transaction
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair, mint], // Signers
  );

// logging the mint account of the token with transfer fees
  
  // Fetching the mint
  const mintDetails = await getMint(connection, mint.publicKey, undefined, TOKEN_2022_PROGRAM_ID);
  console.log('Mint is ->', mintDetails);
  console.log("Transfer Fees has been implemented");
  
  console.log(
    "\nTransaction Sig :",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );


  // Minting some token to source wallet
console.log("==================================================");
console.log("Minting some tokens to source account");

  const sourcekeypair = Keypair.generate();
  let sourceATA = await getOrCreateAssociatedTokenAccount(connection,keypair,mint.publicKey,sourcekeypair.publicKey,undefined,undefined,undefined,TOKEN_2022_PROGRAM_ID);
  console.log('Source ata before mintint ', sourceATA.amount); //logging the payer ata before minting

 //minting
  await mintTo(connection,keypair,mint.publicKey,sourceATA.address,keypair, amountToMint, [keypair], undefined,TOKEN_2022_PROGRAM_ID); //minting to the payer wallet

  sourceATA = await getOrCreateAssociatedTokenAccount(connection,keypair,mint.publicKey,sourcekeypair.publicKey,undefined,undefined,undefined,TOKEN_2022_PROGRAM_ID);
  console.log('Source ata after minting and before sending token ', sourceATA.amount);// logging the source ata after minting


// TRY TRANSFER

//creating destination wallet
console.log("==================================================");
console.log('creating destination keypair, buckle your sit belt please');
console.log("==================================================");

const destinationKeypair = Keypair.generate();
let destinationATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint.publicKey, destinationKeypair.publicKey, false,undefined,undefined,TOKEN_2022_PROGRAM_ID) //destination associated token account
console.log('Destination ata before receiving', destinationATA.amount);// logging the destination ata after before receiving

console.log('Transferring with fee transaction...')

//transfer transaction
await transferCheckedWithFee(connection, keypair,sourceATA.address, mint.publicKey, destinationATA.address, sourcekeypair, BigInt(transferAmount), decimals, BigInt(fee),[sourcekeypair],undefined,TOKEN_2022_PROGRAM_ID);


// logging the payer ata after sending token
sourceATA = await getOrCreateAssociatedTokenAccount(connection,keypair,mint.publicKey,sourcekeypair.publicKey,undefined,undefined,undefined,TOKEN_2022_PROGRAM_ID);
console.log('source ata after sending token ', sourceATA.amount);

// logging the destination ata after receiving token
destinationATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint.publicKey, destinationKeypair.publicKey, false,undefined,undefined,TOKEN_2022_PROGRAM_ID)
console.log('destination ata after receiving ', destinationATA.amount);

//logging the transfer fees
const withheldAmountAfterTransfer = getTransferFeeAmount(destinationATA)
console.log(`Withheld Transfer Fees: ${withheldAmountAfterTransfer?.withheldAmount}\n`)

