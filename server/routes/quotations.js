const express = require('express');
const router = express.Router();

// Mock quotations database
const quotations = [];

// Request quotation
router.post('/', (req, res) => {
  try {
    const { productId, requirements, quantity, customerInfo, deadline } = req.body;
    
    const quotation = {
      id: quotations.length + 1,
      productId,
      requirements,
      quantity,
      customerInfo,
      deadline,
      status: 'pending',
      createdAt: new Date(),
      estimatedPrice: 0, // Will be calculated by admin
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days validity
    };
    
    quotations.push(quotation);
    
    res.status(201).json({
      message: 'Quotation request submitted successfully',
      quotation
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit quotation request' });
  }
});

// Get all quotations
router.get('/', (req, res) => {
  res.json(quotations);
});

// Get quotation by ID
router.get('/:id', (req, res) => {
  const quotation = quotations.find(q => q.id === parseInt(req.params.id));
  
  if (!quotation) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  
  res.json(quotation);
});

// Update quotation (admin only)
router.patch('/:id', (req, res) => {
  const { estimatedPrice, status, notes } = req.body;
  const quotation = quotations.find(q => q.id === parseInt(req.params.id));
  
  if (!quotation) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  
  if (estimatedPrice !== undefined) quotation.estimatedPrice = estimatedPrice;
  if (status !== undefined) quotation.status = status;
  if (notes !== undefined) quotation.notes = notes;
  
  quotation.updatedAt = new Date();
  
  res.json({
    message: 'Quotation updated successfully',
    quotation
  });
});

module.exports = router; 