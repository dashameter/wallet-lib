const { expect } = require('chai');

const {
  Transaction,
  PrivateKey,
} = require('@dashevo/dashcore-lib');

const { Wallet } = require('../../src/index');

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 *
 * @param {DAPIClient} dapiClient
 * @param {Address} faucetAddress
 * @param {PrivateKey} faucetPrivateKey
 * @param {Address} address
 * @param {number} amount
 * @return {Promise<string>}
 */
async function fundAddress(dapiClient, faucetAddress, faucetPrivateKey, address, amount) {
  const { items: inputs } = await dapiClient.getUTXO(faucetAddress);

  const transaction = new Transaction();

  // We take random coz two browsers run in parallel
  // and they can take the same inputs

  const inputIndex = Math.floor(
    Math.random() * Math.floor(inputs.length / 2) * -1,
  );

  transaction.from(inputs.slice(inputIndex)[0])
    .to(address, amount)
    .change(faucetAddress)
    .fee(668)
    .sign(faucetPrivateKey);

  let { blocks: currentBlockHeight } = await dapiClient.getStatus();

  const transactionId = await dapiClient.sendTransaction(transaction.toBuffer());

  const desiredBlockHeight = currentBlockHeight + 1;

  do {
    // eslint-disable-next-line no-await-in-loop
    ({ blocks: currentBlockHeight } = await dapiClient.getStatus());
    // eslint-disable-next-line no-await-in-loop
    await wait(30000);
  } while (currentBlockHeight < desiredBlockHeight);

  return transactionId;
}

const seeds = process.env.DAPI_SEED
  .split(',')
  .map((seed) => ({ service: seed }));

let newWallet;
let wallet;
let account;
describe('Wallet-lib - functional ', function suite() {
  this.timeout(700000);

  describe('Wallet', () => {
    describe('Create a new Wallet', () => {
      it('should create a new wallet with default params', () => {
        newWallet = new Wallet({
          transporter: {
            seeds,
          },
          network: process.env.NETWORK,
        });

        expect(newWallet.walletType).to.be.equal('hdwallet');
        expect(newWallet.plugins).to.be.deep.equal({});
        expect(newWallet.accounts).to.be.deep.equal([]);
        expect(newWallet.keyChain.type).to.be.deep.equal('HDPrivateKey');
        expect(newWallet.passphrase).to.be.deep.equal(null);
        expect(newWallet.allowSensitiveOperations).to.be.deep.equal(false);
        expect(newWallet.injectDefaultPlugins).to.be.deep.equal(true);
        expect(newWallet.walletId).to.length(10);
        expect(newWallet.network).to.be.deep.equal('testnet');

        const exported = newWallet.exportWallet();
        expect(exported.split(' ').length).to.equal(12);
      });
    });
    describe('Load a wallet', () => {
      it('should load a wallet from mnemonic', () => {
        wallet = new Wallet({
          mnemonic: newWallet.mnemonic,
          transporter: {
            seeds,
          },
          network: process.env.NETWORK,
        });

        expect(wallet.walletType).to.be.equal('hdwallet');
        expect(wallet.plugins).to.be.deep.equal({});
        expect(wallet.accounts).to.be.deep.equal([]);
        expect(wallet.keyChain.type).to.be.deep.equal('HDPrivateKey');
        expect(wallet.passphrase).to.be.deep.equal(null);
        expect(wallet.allowSensitiveOperations).to.be.deep.equal(false);
        expect(wallet.injectDefaultPlugins).to.be.deep.equal(true);
        expect(wallet.walletId).to.length(10);
        expect(wallet.network).to.be.deep.equal('testnet');

        const exported = wallet.exportWallet();
        expect(exported).to.equal(newWallet.mnemonic);
      });
    });
  });
  describe('Account', () => {
    it('should await readiness', async () => {
      account = await wallet.getAccount();
      await account.isReady();
      expect(account.state.isReady).to.be.deep.equal(true);
    });

    it('populate balance with dash', async () => {
      const faucetPrivateKey = PrivateKey.fromString(process.env.FAUCET_PRIVATE_KEY);
      const faucetAddress = faucetPrivateKey
        .toAddress(process.env.NETWORK)
        .toString();

      await fundAddress(
        wallet.transporter.client,
        faucetAddress,
        faucetPrivateKey,
        account.getAddress().address,
        20000,
      );
    });

    it('should has unusedAddress with index 1', () => {
      const unusedAddress = account.getUnusedAddress();
      expect(unusedAddress.index).to.equal(1);
    });
    it('should not have empty balance', () => {
      expect(account.getTotalBalance()).to.not.equal(0);
    });
    it('should returns some available UTXO', () => {
      const UTXOs = account.getUTXOS();
      expect(UTXOs.length).to.not.equal(0);
    });
    it('should create a transaction', () => {
      const newTx = account.createTransaction({ recipient: 'ydvgJ2eVSmdKt78ZSVBJ7zarVVtdHGj3yR', satoshis: Math.floor(account.getTotalBalance() / 2) });
      expect(newTx.constructor.name).to.equal('Transaction');
      expect(newTx.outputs.length).to.not.equal(0);
      expect(newTx.inputs.length).to.not.equal(0);
    });
  });
  after('Disconnection', () => {
    account.disconnect();
    wallet.disconnect();
    newWallet.disconnect();
  });
});
