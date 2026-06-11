const axios = require('axios');
const Order = require('../models/Order');
const WipBatch = require('../models/WipBatch');
const ProductionPlan = require('../models/ProductionPlan');

// @desc    Call Python AI to predict shots needed
// @route   POST /api/ai/predict-shots
// @access  Private (supervisor, admin, super_admin)
exports.predictShots = async (req, res, next) => {
  try {
    const { modelNumber, shortageMeters } = req.body;

    // Call Python FastAPI service (usually running on port 8000 locally or internal docker network)
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    
    const response = await axios.post(`${pythonApiUrl}/predict/shots`, {
      model_number: modelNumber,
      shortage_meters: shortageMeters
    });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('AI Service Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to AI Brain Service' });
  }
};

// @desc    Call Python AI Chatbot
// @route   POST /api/ai/chat
// @access  Private
exports.chatWithAI = async (req, res, next) => {
  try {
    const { message } = req.body;
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    
    const response = await axios.post(`${pythonApiUrl}/chat`, { message });

    res.status(200).json({
      success: true,
      reply: response.data.reply
    });
  } catch (error) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to Chatbot' });
  }
};

// @desc    Get aggregated factory reports for Analytics
// @route   GET /api/ai/reports
// @access  Private (admin, super_admin)
exports.getReports = async (req, res, next) => {
  try {
    // 1. QC Pass vs Reject Ratio (from WipBatch shotDetails)
    const qcData = await WipBatch.aggregate([
      { $match: { 'shotDetails.processedQty': { $exists: true } } },
      { $group: { 
          _id: null, 
          passed: { $sum: '$shotDetails.processedQty' }, 
          rejected: { $sum: '$shotDetails.rejectedQty' } 
      }}
    ]);
    const qcPassReject = qcData.length > 0 ? qcData[0] : { passed: 0, rejected: 0 };

    // 2. Production Output over time (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const outputData = await WipBatch.aggregate([
      { $match: { 
          currentStage: 'ready_for_assembly', 
          updatedAt: { $gte: sevenDaysAgo } 
      }},
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          meters: { $sum: '$materialIssued' } // Simplified as proxy for output
      }},
      { $sort: { '_id': 1 } }
    ]);

    // 3. Top Models Ordered
    const topModels = await Order.aggregate([
      { $group: { _id: '$modelNumber', totalOrdered: { $sum: '$orderQuantity' } } },
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        qc: [
          { name: 'Passed', value: qcPassReject.passed },
          { name: 'Rejected', value: qcPassReject.rejected }
        ],
        output: outputData.map(d => ({ date: d._id, output: d.meters })),
        topModels: topModels.map(m => ({ model: m._id, quantity: m.totalOrdered }))
      }
    });
  } catch (error) {
    next(error);
  }
};
