const express = require('express');
const { deployToken, getTokenInfo, getTokenBalance } = require('../controllers/tokenController');

const router = express.Router();

// Token deployment
router.post('/deploy', deployToken);

// Token information
router.get('/info/:tokenAddress', getTokenInfo);

// Token balance
router.get('/balance/:tokenAddress/:ownerAddress', getTokenBalance);

module.exports = router;
