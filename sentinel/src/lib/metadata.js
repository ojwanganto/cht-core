const db = require('../db');
const logger = require('../lib/logger');

const METADATA_DOCUMENT = '_local/sentinel-meta-data';

// If you need to store something new add it here to set a default
const METADATA_TEMPLATE = {
  _id: METADATA_DOCUMENT,
  transitions_seq: 0
};

const getMetaData = () => {
  return db.sentinel.get(METADATA_DOCUMENT)
    .then(doc => Object.assign({}, METADATA_TEMPLATE, doc));
};

const getProcessedSeq = () => {
  return getMetaData()
    .then(doc => doc.transitions_seq)
    .catch(err => {
      logger.error('Error getting meta data: %o', err);
      throw err;
    });
};

// TODO: Make thread safe
const updateMetaData = seq => {
  return getMetaData()
    .then(doc => {
      doc.transitions_seq = seq;
      return db.sentinel.put(doc).catch(err => {
        if (err) {
          logger.error('Error updating metaData: %o', err);
        }
      });
    })
    .catch(err => {
      logger.error('Error fetching metaData for update: %o', err);
      return null;
    });
};

module.exports = {
  getProcessedSeq: () => getProcessedSeq(),
  update: seq => updateMetaData(seq),
};
