const { expect } = require('chai');
const transporters = require('../../../index');

const fixture = {
  totalItems: 1,
  from: 0,
  to: 1,
  items: [
    {
      address: 'yYpSw2n2TRzoQaUShNsPo541z4bz4EJkGN',
      txid: '3ab6ebc86b9cdea1580d376510e54a904f74fcaf38dfe9363fb44bcf33f83703',
      outputIndex: 0,
      script: '76a914891da44c4bb40cbc32a186a99bb5f935ae92750288ac',
      satoshis: 1000000000,
      height: 9484,
    },
  ],
};
describe('transporters - DAPIClientWrapper - .getUTXO', function suite() {
  this.timeout(10000);
  const transporter = transporters.resolve('DAPIClient');
  it('should works', async () => {
    transporter.client.getUTXO = () => fixture;
    const res = await transporter.getUTXO('yYpSw2n2TRzoQaUShNsPo541z4bz4EJkGN');
    expect(res).to.deep.equal(fixture.items);
  });
});
