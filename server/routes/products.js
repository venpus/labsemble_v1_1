const express = require('express');
const router = express.Router();

// Mock products database
const products = [
  {
    id: 1,
    name: 'PCB Manufacturing',
    category: 'PCB',
    description: 'High-quality PCB manufacturing with quick turnaround',
    features: ['1-32 layers', 'FR4, Aluminum, Rogers', '24h build time'],
    pricing: {
      base: 2,
      unit: 'per 5pcs',
      details: '1-4L: $2 for 100×100mm, 4L: $2 for 50×50mm'
    },
    image: '/images/pcb-manufacturing.jpg',
    specifications: {
      layers: '1-32',
      materials: ['FR4', 'Aluminum', 'Copper', 'Rogers', 'PTFE'],
      buildTime: '24 hours - 4 days',
      minQuantity: 5
    }
  },
  {
    id: 2,
    name: 'PCB Assembly',
    category: 'Assembly',
    description: 'Professional PCB assembly services with in-stock parts',
    features: ['SMT & THT', 'In-stock parts', 'Free DFM check', '24h build time'],
    pricing: {
      base: 2,
      unit: 'per 5pcs',
      details: 'Professional assembly with quality guarantee'
    },
    image: '/images/pcb-assembly.jpg',
    specifications: {
      technology: ['SMT', 'THT', 'Mixed'],
      parts: 'In-stock components',
      buildTime: '24 hours',
      minQuantity: 5
    }
  },
  {
    id: 3,
    name: '3D Printing',
    category: '3D Printing',
    description: 'Professional 3D printing services with multiple technologies',
    features: ['SLA, MJF, SLM, FDM, SLS', 'Resin, Nylon, Metal, ABS', 'Price from $0.08/g'],
    pricing: {
      base: 0.30,
      unit: 'per gram',
      details: 'Price as low as $0.08/g depending on material and technology'
    },
    image: '/images/3d-printing.jpg',
    specifications: {
      technologies: ['SLA', 'MJF', 'SLM', 'FDM', 'SLS'],
      technologies: ['SLA', 'MJF', 'SLM', 'FDM', 'SLS'],
      materials: ['Resin', 'Nylon', 'Metal', 'ABS'],
      buildTime: '3 days',
      minPrice: 0.08
    }
  },
  {
    id: 4,
    name: 'CNC Machining',
    category: 'CNC',
    description: 'Precision CNC machining with tight tolerances',
    features: ['3-5 axis milling', 'Turning', 'Aluminum, Copper, Plastic', '±0.05mm tolerance'],
    pricing: {
      base: 1,
      unit: 'per part',
      details: 'Professional machining with tight tolerances'
    },
    image: '/images/cnc-machining.jpg',
    specifications: {
      operations: ['Milling', 'Turning'],
      axes: '3-, 4- & full 5-axis',
    }
  }
];

// Get all products
router.get('/', (req, res) => {
  const { category, search } = req.query;
  
  let filteredProducts = products;
  
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }
  
  if (search) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json(filteredProducts);
});

// Get product by ID
router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
});

// Get products by category
router.get('/category/:category', (req, res) => {
  const categoryProducts = products.filter(p => p.category === req.params.category);
  res.json(categoryProducts);
});

module.exports = router; 