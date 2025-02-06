const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { format, parseISO, formatDistanceToNow } = require("date-fns");

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

// Function to calculate recommendations based on the score
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
        clientWebsite,
        score,
        preciseScore,
        totalScore,
        categories,
        isEvaluationFinished,
    } = req.body;

    // Function to calculate priority based on createdAt
    const calculatePriority = (createdAt) => {
        const dateString = createdAt instanceof Date ? createdAt.toISOString() : createdAt;

        try {
            const createdDate = parseISO(dateString);
            const monthsDifference = formatDistanceToNow(createdDate, { unit: 'month' }).split(" ")[0];
            const monthsAgo = parseInt(monthsDifference, 10);

            if (monthsAgo >= 12) {
                return "High"; // More than 12 months ago
            } else if (monthsAgo >= 6) {
                return "Medium"; // Between 6 and 12 months ago
            } else if (monthsAgo >= 3) {
                return "Low"; // Between 3 and 6 months ago
            } else {
                return "Update"; // Less than 3 months ago (optional, if you want to differentiate)
            }
        } catch (error) {
            console.error("Error in calculating priority:", error);
            return "Unknown"; // Return a fallback value if parsing fails
        }
    };

    // Compute recommendations based on the score
    const finalRecommendationNotes = getRecommendations(score);

    if (clientName === undefined || clientEmail === undefined) {
        return res.status(400).json({ msg: "Client name and email are required." });
    }

    if (score === undefined || preciseScore === undefined || totalScore === undefined) {
        return res.status(400).json({ msg: "All required fields must be provided." });
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
        // Create a new evaluation and assign the computed tier, recommendations, priority, and lastEvaluation
        const newEvaluation = new Evaluation({
            clientName,
            clientEmail,
            clientWebsite,
            score,
            preciseScore,
            totalScore,
            tier,
            recommendationNotes: finalRecommendationNotes,
            categories,
            isEvaluationFinished,
            priority: calculatePriority(new Date()), // Calculate and store priority
            lastEvaluation: format(new Date(), 'dd/MM/yyyy'), // Format the last evaluation date
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

app.put("/api/updatecategories/:id", async (req, res) => {
    const { id } = req.params; // Get document _id from params
    const { categories } = req.body; // Get categories from request body

    if (!categories) {
        return res.status(400).json({ msg: "Categories object is required" });
    }

    try {
        // Find the existing evaluation document
        const evaluation = await Evaluation.findById(id);

        if (!evaluation) {
            return res.status(404).json({ msg: "Evaluation not found" });
        }

        // Update categories
        Object.keys(categories).forEach((category) => {
            if (evaluation.categories[category]) {
                Object.assign(evaluation.categories[category], categories[category]);
            } else {
                evaluation.categories[category] = categories[category];
            }
        });

        // Recalculate score based on updated categories
        const newScore = calculateScore(evaluation.categories); // Calculate the new score
        evaluation.score = newScore;

        // Recalculate preciseScore based on your logic
        const newPreciseScore = calculatePreciseScore(evaluation.categories); // Implement this function based on your logic
        evaluation.preciseScore = newPreciseScore;

        // Set isEvaluationFinished to true
        evaluation.isEvaluationFinished = true;

        // Determine the new tier based on the new score
        if (newScore >= 800 && newScore <= 1000) {
            evaluation.tier = "Tier1";
        } else if (newScore >= 600 && newScore < 800) {
            evaluation.tier = "Tier2";
        } else if (newScore >= 400 && newScore < 600) {
            evaluation.tier = "Tier3";
        } else {
            evaluation.tier = "Tier4"; // Default to Tier4
        }

        // Optionally, update other fields like lastEvaluation or recommendations
        evaluation.lastEvaluation = format(new Date(), 'dd/MM/yyyy');
        evaluation.recommendationNotes = getRecommendations(newScore); // Now this function is accessible

        // Save the updated document
        await evaluation.save();

        res.status(200).json({
            msg: "Categories updated and evaluation recalculated successfully",
            updatedEvaluation: evaluation,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});
app.delete("/api/removeuser/:id", async (req, res) => {
    const { id } = req.params; // Get document _id from params

    try {
        const evaluation = await Evaluation.findByIdAndDelete(id);
        if (!evaluation) {
            return res.status(404).json({ msg: "Evaluation not found" });
        }
        res.status(200).json({ msg: "User deleted successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Function to calculate score based on categories
const calculateScore = (categories) => {
    let score = 0;
    Object.values(categories).forEach(category => {
        score += category.score || 0; // Assuming each category has a score property
    });
    return score;
};

// Function to calculate precise score based on categories
const calculatePreciseScore = (categories) => {
    let preciseScore = 0;
    Object.values(categories).forEach(category => {
        preciseScore += category.preciseScore || 0; // Assuming each category has a preciseScore property
    });
    return preciseScore;
};

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
