const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');

describe('metadata', () => {

  afterEach(() => sinon.restore());

  describe('getTransitionSeq', () => {

    it('fetches metadata doc', () => {
      sinon.stub(db.sentinel, 'get').resolves({
        _id: '_local/sentinel-meta-data',
        _rev: '1',
        transitions_seq: '12'
      });
      sinon.stub(db.medic, 'get').resolves();
      sinon.stub(db.medic, 'put').resolves();
      return metadata.getTransitionSeq().then(seq => {
        chai.expect(db.medic.get.callCount).to.equal(0);
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(seq).to.equal('12');
      });
    });

  });

  // describe('update', () => {
  //   it('works as expected', () => {
  //     sinon.stub(db.sentinel, 'get').resolves({
  //       _id: '_local/sentinel-meta-data',
  //       _rev: '1',
  //       transitions_seq: '12'
  //     });
  //     sinon.stub(db.sentinel, 'put').resolves();
  //     return metadata.update('55').then(() => {
  //       chai.expect(db.sentinel.get.callCount).to.equal(1);
  //       chai.expect(db.sentinel.put.callCount).to.equal(1);
  //       chai.expect(db.sentinel.put.args[0][0]).to.deep.equal({
  //         _id: '_local/sentinel-meta-data',
  //         _rev: '1',
  //         transitions_seq: '55'
  //       });
  //     });
  //   });
  // });

});
