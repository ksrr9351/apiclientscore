const mongoose = require("mongoose");

const evaluationCategorySchema = new mongoose.Schema(
  {
    score: { type: Number, required: false },
    totalScore: { type: Number, required: false },
    preciseScore: { type: Number, required: false },
    revenuePotential: { type: Number },
    fundingStage: { type: Number },
    budgetCommitment: { type: Number },
    liquidity: { type: Number },
    paymentTimeliness: { type: Number },
    industryRelevance: { type: Number },
    geographicTargeting: { type: Number },
    regulatoryCompliance: { type: Number },
    partnershipPotential: { type: Number },
    onBoardingProcess: { type: Number },
    resourceUtilization: { type: Number },
    projectTimeliness: { type: Number },
    marketCap: { type: Number },
    holderDistribution: { type: Number },
    stability: { type: Number },
    communitySize: { type: Number },
    socialMediaInfluence: { type: Number },
    influencerReach: { type: Number },
    contentQuality: { type: Number },
    brandAlignment: { type: Number },
    marketScalability: { type: Number },
    marketOpportunity: { type: Number },
    foundersBackground: { type: Number },
    strategicVision: { type: Number },
    regulatoryExposure: { type: Number },
    financialStability: { type: Number },
    reputation: { type: Number },
  },
  { _id: false }
);

const evaluationObjSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true }, // New field for client name
    clientEmail: { type: String, required: true }, // New field for client email
    clientWebsite: { type: String }, // Optional field for client website
    score: { type: Number, required: false },
    preciseScore: { type: Number, required: false },
    totalScore: { type: Number, required: false },
    tier: { type: String, required: false },
    isEvaluationFinished: { type: Boolean, default: false },
    recommendationNotes: { type: [String], default: [] }, // Add recommendation notes field

    categories: {
      financialHealth: evaluationCategorySchema,
      strategicFit: evaluationCategorySchema,
      operationalExcellence: evaluationCategorySchema,
      tokenMetrics: evaluationCategorySchema,
      marketingBrand: evaluationCategorySchema,
      marketVision: evaluationCategorySchema,
      riskProfile: evaluationCategorySchema,
    },
  },
  { timestamps: true }
);

const Evaluation = mongoose.model("Evaluation", evaluationObjSchema);

module.exports = Evaluation;
