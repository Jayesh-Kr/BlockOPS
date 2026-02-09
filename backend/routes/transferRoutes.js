const express = require('express');
const { transfer, getBalance } = require('../controllers/transferController');

const router = express.Router();

// Transfer endpoint
router.post('/', transfer);

// Get native balance
router.get('/balance/:address', getBalance);

module.exports = router;
