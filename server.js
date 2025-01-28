const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Import models
const User = require("./models/user");
const AddClientForm = require("./models/addclient");
const Evaluation = require("./models/evaluation");

// Add Client Route
app.post("/api/addclient", async (req, res) => {
  const { name, email, website } = req.body;

  if (!name || !email) {
    return res.status(400).json({ msg: "Name and email are required" });
  }

  try {
    const newClient = new AddClientForm({ name, email, website });
    await newClient.save();
    res.status(201).json({ msg: "Client added successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get All Clients Route
app.get("/api/clients", async (req, res) => {
  try {
    const clients = await AddClientForm.find();
    res.status(200).json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Register Route
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ msg: "User created successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Add Evaluation Route
app.post("/api/addevaluation", async (req, res) => {
    const {
      clientName,
      clientEmail,
      clientWebsite, // Optional
      score,
      preciseScore,
      totalScore,
      categories,
      isEvaluationFinished, // Add this field
    } = req.body;
  
    // Move this function above its usage
    const getRecommendations = (score) => {
      if (score >= 800 && score <= 1000) {
        return []; // No recommendations needed
      } else if (score >= 600 && score < 800) {
        return [
          "Optimize Operations.",
          "Prioritize High-Impact Projects.",
          "Enhance Partnerships.",
        ];
      } else if (score >= 400 && score < 600) {
        return [
          "Address Process Inefficiencies.",
          "Identify Growth Opportunities.",
          "Increase Client Engagement.",
        ];
      } else if (score >= 0 && score < 400) {
        return [
          "Assess and Restructure.",
          "Achieve Quick Wins.",
          "Refine Value Proposition.",
        ];
      } else {
        return []; // Fallback for invalid scores
      }
    };
  
    // Assign recommendations based on score
    const recommendationNotes = getRecommendations(score);
  
    if (!clientName || !clientEmail) {
      return res
        .status(400)
        .json({ msg: "Client name and email are required." });
    }
  
    if (!score || !preciseScore || !totalScore) {
      return res
        .status(400)
        .json({ msg: "All required fields must be provided." });
    }
  
    // Determine the tier based on the score
    let tier = "Tier4"; // Default to Tier4
    if (score >= 800 && score <= 1000) {
      tier = "Tier1";
    } else if (score >= 600 && score < 800) {
      tier = "Tier2";
    } else if (score >= 400 && score < 600) {
      tier = "Tier3";
    }
  
    try {
      // Create a new evaluation and assign the computed tier
      const newEvaluation = new Evaluation({
        clientName,
        clientEmail,
        clientWebsite,
        score,
        preciseScore,
        totalScore,
        tier, // Automatically assign tier
        recommendationNotes, // Automatically assigned here
        categories,
        isEvaluationFinished,
      });
  
      await newEvaluation.save();
      res.status(201).json({ msg: "Evaluation added successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error" });
    }
  });
  
  

// Get All Evaluations Route
app.get("/api/evaluations", async (req, res) => {
  try {
    const evaluations = await Evaluation.find();
    res.status(200).json(evaluations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
